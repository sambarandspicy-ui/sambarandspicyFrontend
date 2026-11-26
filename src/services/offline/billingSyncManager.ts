import type * as D from "@/types/domain";
import { ApiError } from "@/types/api";
import { api, type PosApiClient } from "@/services/api";
import { onSessionExpired } from "@/services/api/session";
import {
  ensureOutboxInitialized,
  getPendingBills,
  markFailed,
  markPendingRetry,
  markSyncing,
  onBillEnqueued,
  removeSyncedBill,
  subscribeOutbox,
} from "./billingOutbox";

const BACKOFF_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000] as const;
const FALLBACK_POLL_INTERVAL_MS = 20_000;

export type BillSyncedCallback = (
  syncedBill: D.BillDetail,
  clientBillId: string,
) => void;

export interface BillingSyncState {
  isSyncing: boolean;
  pausedForAuth: boolean;
}

export type SyncStateListener = (state: BillingSyncState) => void;

type ErrorKind = "RETRYABLE" | "AUTH" | "PERMANENT";

function classifySyncError(error: unknown): {
  kind: ErrorKind;
  message: string;
} {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        kind: "AUTH",
        message: error.message || "Session expired. Please sign in to resume sync.",
      };
    }
    if (
      error.status === 0 ||
      error.status === 429 ||
      error.status >= 500 ||
      error.code === "NETWORK_ERROR"
    ) {
      return {
        kind: "RETRYABLE",
        message:
          error.message ||
          "Network or server temporarily unavailable. Will retry automatically.",
      };
    }
    return {
      kind: "PERMANENT",
      message: error.message || "Bill rejected by server validation.",
    };
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unexpected network error during sync.";
  return { kind: "RETRYABLE", message };
}

function getBackoffDelayMs(retryCountBeforeIncrement: number): number {
  const index = Math.min(
    Math.max(0, retryCountBeforeIncrement),
    BACKOFF_DELAYS_MS.length - 1,
  );
  return BACKOFF_DELAYS_MS[index];
}

export class BillingSyncManager {
  private started = false;
  private refCount = 0;
  private isSyncing = false;
  private pausedForAuth = false;
  private rerunRequested = false;
  private inFlightSync: Promise<void> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private readonly syncedCallbacks = new Set<BillSyncedCallback>();
  private readonly stateListeners = new Set<SyncStateListener>();
  private readonly cleanupFns: (() => void)[] = [];

  constructor(private readonly client: PosApiClient = api) {}

  getSyncState(): BillingSyncState {
    return {
      isSyncing: this.isSyncing,
      pausedForAuth: this.pausedForAuth,
    };
  }

  subscribeSyncState(listener: SyncStateListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  onBillSynced(callback: BillSyncedCallback): () => void {
    this.syncedCallbacks.add(callback);
    return () => {
      this.syncedCallbacks.delete(callback);
    };
  }

  private emitSyncState(): void {
    const snapshot = this.getSyncState();
    for (const listener of this.stateListeners) {
      try {
        listener(snapshot);
      } catch {
        // Keep listener notifications isolated.
      }
    }
  }

  private emitBillSynced(syncedBill: D.BillDetail, clientBillId: string): void {
    const normalized: D.BillDetail = {
      ...syncedBill,
      clientBillId: syncedBill.clientBillId ?? clientBillId,
      syncStatus: "SYNCED",
      syncError: null,
    };
    for (const cb of this.syncedCallbacks) {
      try {
        cb(normalized, clientBillId);
      } catch {
        // Never allow cache/UI subscriber errors to abort queue processing.
      }
    }
  }

  private async refreshPollTimer(): Promise<void> {
    if (!this.started) {
      this.clearPollTimer();
      return;
    }
    try {
      const pending = await getPendingBills();
      if (pending.length > 0 && !this.pausedForAuth) {
        if (!this.pollTimer) {
          this.pollTimer = setInterval(() => {
            void this.syncNow({ preserveAuthPause: true });
          }, FALLBACK_POLL_INTERVAL_MS);
        }
      } else {
        this.clearPollTimer();
      }
    } catch {
      this.clearPollTimer();
    }
  }

  private clearPollTimer(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    const unsubEnqueue = onBillEnqueued(() => {
      this.pausedForAuth = false;
      void this.syncNow();
    });
    this.cleanupFns.push(unsubEnqueue);

    const unsubOutbox = subscribeOutbox(() => {
      void this.refreshPollTimer();
    });
    this.cleanupFns.push(unsubOutbox);

    const unsubSession = onSessionExpired(() => {
      this.pausedForAuth = true;
      this.clearPollTimer();
      this.emitSyncState();
    });
    this.cleanupFns.push(unsubSession);

    if (typeof window !== "undefined") {
      const handleOnline = () => {
        void this.syncNow();
      };
      window.addEventListener("online", handleOnline);
      this.cleanupFns.push(() =>
        window.removeEventListener("online", handleOnline),
      );
    }

    if (typeof document !== "undefined") {
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          void this.syncNow();
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      this.cleanupFns.push(() =>
        document.removeEventListener("visibilitychange", handleVisibility),
      );
    }

    void ensureOutboxInitialized()
      .then(() => this.refreshPollTimer())
      .then(() => this.syncNow())
      .catch(() => {
        // Outbox recovery errors are non-fatal during startup.
      });
  }

  acquire(): () => void {
    this.refCount++;
    this.start();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        this.stop();
      }
    };
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.refCount = 0;
    this.clearPollTimer();
    while (this.cleanupFns.length > 0) {
      const fn = this.cleanupFns.pop();
      try {
        fn?.();
      } catch {
        // Ignore cleanup errors.
      }
    }
  }

  syncNow(options: { preserveAuthPause?: boolean } = {}): Promise<void> {
    if (!options.preserveAuthPause && this.pausedForAuth) {
      this.pausedForAuth = false;
      this.emitSyncState();
    }
    if (options.preserveAuthPause && this.pausedForAuth) {
      return Promise.resolve();
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      void this.refreshPollTimer();
      return Promise.resolve();
    }

    if (this.inFlightSync) {
      this.rerunRequested = true;
      return this.inFlightSync;
    }

    this.inFlightSync = this.runSyncLoop().finally(() => {
      this.inFlightSync = null;
      this.isSyncing = false;
      this.emitSyncState();
      void this.refreshPollTimer();
    });

    return this.inFlightSync;
  }

  private async runSyncLoop(): Promise<void> {
    this.isSyncing = true;
    this.emitSyncState();

    do {
      this.rerunRequested = false;
      if (this.pausedForAuth) break;
      if (typeof navigator !== "undefined" && navigator.onLine === false) break;

      await ensureOutboxInitialized();
      const pending = await getPendingBills();
      const now = Date.now();
      const dueBills = pending.filter((record) => record.nextRetryAt <= now);

      for (const record of dueBills) {
        if (this.pausedForAuth) break;
        if (typeof navigator !== "undefined" && navigator.onLine === false) break;

        const syncingRecord = await markSyncing(record.clientBillId);
        if (!syncingRecord) continue;

        try {
          const syncedBill = await this.client.checkoutBill(syncingRecord.payload);
          await removeSyncedBill(syncingRecord.clientBillId);
          this.emitBillSynced(syncedBill, syncingRecord.clientBillId);
        } catch (error) {
          const classification = classifySyncError(error);
          if (classification.kind === "AUTH") {
            await markPendingRetry(
              syncingRecord.clientBillId,
              syncingRecord.retryCount,
              0,
              classification.message,
            );
            this.pausedForAuth = true;
            this.emitSyncState();
            break;
          }
          if (classification.kind === "RETRYABLE") {
            const delayMs = getBackoffDelayMs(syncingRecord.retryCount);
            await markPendingRetry(
              syncingRecord.clientBillId,
              syncingRecord.retryCount + 1,
              Date.now() + delayMs,
              classification.message,
            );
            // Transient network/server failure: stop current pass and wait for next backoff/trigger.
            break;
          }
          await markFailed(syncingRecord.clientBillId, classification.message);
          // Permanent validation/conflict error: continue processing next queued bill in FIFO order.
        }
      }
    } while (this.rerunRequested && !this.pausedForAuth);
  }
}

export const billingSyncManager = new BillingSyncManager(api);
