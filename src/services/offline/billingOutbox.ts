import type * as D from "@/types/domain";
import type { CheckoutInput } from "@/services/api/types";
import {
  idbRequest,
  isIndexedDbAvailable,
  OUTBOX_STORE,
  withStore,
} from "./indexedDb";

export type OutboxSyncStatus = "PENDING" | "SYNCING" | "FAILED";

export interface QueuedBillRecord {
  clientBillId: string;
  payload: CheckoutInput;
  localBill: D.BillDetail;
  syncStatus: OutboxSyncStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  nextRetryAt: number;
}

export type EnqueueBillInput = Omit<
  QueuedBillRecord,
  "syncStatus" | "retryCount" | "lastError" | "nextRetryAt"
> &
  Partial<
    Pick<
      QueuedBillRecord,
      "syncStatus" | "retryCount" | "lastError" | "nextRetryAt"
    >
  >;

type OutboxListener = () => void;
type EnqueueListener = (record: QueuedBillRecord) => void;

const outboxListeners = new Set<OutboxListener>();
const enqueueListeners = new Set<EnqueueListener>();
let bootRecoveryPromise: Promise<void> | null = null;

function notifyOutboxListeners(): void {
  for (const listener of outboxListeners) {
    try {
      listener();
    } catch {
      // Keep notification fan-out isolated across subscribers.
    }
  }
}

function notifyEnqueueListeners(record: QueuedBillRecord): void {
  for (const listener of enqueueListeners) {
    try {
      listener(record);
    } catch {
      // Ignore subscriber errors during enqueue notification.
    }
  }
}

function sortByCreatedAtAsc(records: QueuedBillRecord[]): QueuedBillRecord[] {
  return [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function withBillSyncMetadata(
  bill: D.BillDetail,
  clientBillId: string,
  syncStatus: D.BillSyncStatus,
  syncError: string | null,
): D.BillDetail {
  return {
    ...bill,
    clientBillId,
    client_bill_id: bill.client_bill_id ?? clientBillId,
    syncStatus,
    syncError,
  };
}

async function performBootRecovery(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  const recovered = await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    const all = await idbRequest<QueuedBillRecord[]>(store.getAll());
    let count = 0;
    for (const record of all) {
      if (record.syncStatus === "SYNCING") {
        const updated: QueuedBillRecord = {
          ...record,
          syncStatus: "PENDING",
          nextRetryAt: 0,
          localBill: withBillSyncMetadata(
            record.localBill,
            record.clientBillId,
            "PENDING",
            record.lastError,
          ),
        };
        await idbRequest(store.put(updated));
        count++;
      }
    }
    return count;
  });
  if (recovered > 0) {
    notifyOutboxListeners();
  }
}

export async function ensureOutboxInitialized(): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  if (!bootRecoveryPromise) {
    bootRecoveryPromise = performBootRecovery().catch((err) => {
      bootRecoveryPromise = null;
      throw err;
    });
  }
  await bootRecoveryPromise;
}

export function resetOutboxBootState(): void {
  bootRecoveryPromise = null;
}

export async function recoverStaleSyncingBills(): Promise<number> {
  if (!isIndexedDbAvailable()) return 0;
  const count = await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    const all = await idbRequest<QueuedBillRecord[]>(store.getAll());
    let recovered = 0;
    for (const record of all) {
      if (record.syncStatus === "SYNCING") {
        const updated: QueuedBillRecord = {
          ...record,
          syncStatus: "PENDING",
          nextRetryAt: 0,
          localBill: withBillSyncMetadata(
            record.localBill,
            record.clientBillId,
            "PENDING",
            record.lastError,
          ),
        };
        await idbRequest(store.put(updated));
        recovered++;
      }
    }
    return recovered;
  });
  if (count > 0) {
    notifyOutboxListeners();
  }
  return count;
}

export async function enqueueBill(
  input: EnqueueBillInput,
): Promise<QueuedBillRecord> {
  await ensureOutboxInitialized();
  const syncStatus: OutboxSyncStatus = input.syncStatus ?? "PENDING";
  const lastError = input.lastError ?? null;
  const record: QueuedBillRecord = {
    clientBillId: input.clientBillId,
    payload: {
      ...input.payload,
      clientBillId: input.payload.clientBillId ?? input.clientBillId,
      clientCreatedAt: input.payload.clientCreatedAt ?? input.createdAt,
    },
    localBill: withBillSyncMetadata(
      input.localBill,
      input.clientBillId,
      syncStatus,
      lastError,
    ),
    syncStatus,
    retryCount: input.retryCount ?? 0,
    lastError,
    createdAt: input.createdAt,
    nextRetryAt: input.nextRetryAt ?? 0,
  };

  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is unavailable; cannot enqueue offline bill.");
  }

  await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    await idbRequest(store.put(record));
  });
  notifyOutboxListeners();
  notifyEnqueueListeners(record);
  return record;
}

export async function getAllQueuedBills(): Promise<QueuedBillRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  await ensureOutboxInitialized();
  const all = await withStore(OUTBOX_STORE, "readonly", async (store) => {
    return idbRequest<QueuedBillRecord[]>(store.getAll());
  });
  return sortByCreatedAtAsc(all);
}

export async function getPendingBills(): Promise<QueuedBillRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  await ensureOutboxInitialized();
  const all = await withStore(OUTBOX_STORE, "readonly", async (store) => {
    return idbRequest<QueuedBillRecord[]>(store.getAll());
  });
  return sortByCreatedAtAsc(all.filter((r) => r.syncStatus === "PENDING"));
}

export async function markSyncing(
  clientBillId: string,
): Promise<QueuedBillRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  await ensureOutboxInitialized();
  const updated = await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    const existing = await idbRequest<QueuedBillRecord | undefined>(
      store.get(clientBillId),
    );
    if (!existing) return null;
    const nextRecord: QueuedBillRecord = {
      ...existing,
      syncStatus: "SYNCING",
      localBill: withBillSyncMetadata(
        existing.localBill,
        existing.clientBillId,
        "SYNCING",
        null,
      ),
    };
    await idbRequest(store.put(nextRecord));
    return nextRecord;
  });
  if (updated) notifyOutboxListeners();
  return updated;
}

export async function markPendingRetry(
  clientBillId: string,
  retryCount: number,
  nextRetryAt: number,
  lastError: string | null,
): Promise<QueuedBillRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  await ensureOutboxInitialized();
  const updated = await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    const existing = await idbRequest<QueuedBillRecord | undefined>(
      store.get(clientBillId),
    );
    if (!existing) return null;
    const nextRecord: QueuedBillRecord = {
      ...existing,
      syncStatus: "PENDING",
      retryCount,
      nextRetryAt,
      lastError,
      localBill: withBillSyncMetadata(
        existing.localBill,
        existing.clientBillId,
        "PENDING",
        lastError,
      ),
    };
    await idbRequest(store.put(nextRecord));
    return nextRecord;
  });
  if (updated) notifyOutboxListeners();
  return updated;
}

export async function markFailed(
  clientBillId: string,
  lastError: string,
): Promise<QueuedBillRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  await ensureOutboxInitialized();
  const updated = await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    const existing = await idbRequest<QueuedBillRecord | undefined>(
      store.get(clientBillId),
    );
    if (!existing) return null;
    const nextRecord: QueuedBillRecord = {
      ...existing,
      syncStatus: "FAILED",
      lastError,
      localBill: withBillSyncMetadata(
        existing.localBill,
        existing.clientBillId,
        "FAILED",
        lastError,
      ),
    };
    await idbRequest(store.put(nextRecord));
    return nextRecord;
  });
  if (updated) notifyOutboxListeners();
  return updated;
}

export async function removeSyncedBill(clientBillId: string): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  await ensureOutboxInitialized();
  await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    await idbRequest(store.delete(clientBillId));
  });
  notifyOutboxListeners();
}

export async function resetFailedToPending(): Promise<number> {
  if (!isIndexedDbAvailable()) return 0;
  await ensureOutboxInitialized();
  const count = await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    const all = await idbRequest<QueuedBillRecord[]>(store.getAll());
    let resetCount = 0;
    for (const record of all) {
      if (record.syncStatus === "FAILED") {
        const nextRecord: QueuedBillRecord = {
          ...record,
          syncStatus: "PENDING",
          lastError: null,
          nextRetryAt: 0,
          localBill: withBillSyncMetadata(
            record.localBill,
            record.clientBillId,
            "PENDING",
            null,
          ),
        };
        await idbRequest(store.put(nextRecord));
        resetCount++;
      }
    }
    return resetCount;
  });
  if (count > 0) notifyOutboxListeners();
  return count;
}

export async function resetSingleFailedToPending(
  clientBillId: string,
): Promise<QueuedBillRecord | null> {
  if (!isIndexedDbAvailable()) return null;
  await ensureOutboxInitialized();
  const updated = await withStore(OUTBOX_STORE, "readwrite", async (store) => {
    const existing = await idbRequest<QueuedBillRecord | undefined>(
      store.get(clientBillId),
    );
    if (!existing || existing.syncStatus !== "FAILED") return null;
    const nextRecord: QueuedBillRecord = {
      ...existing,
      syncStatus: "PENDING",
      lastError: null,
      nextRetryAt: 0,
      localBill: withBillSyncMetadata(
        existing.localBill,
        existing.clientBillId,
        "PENDING",
        null,
      ),
    };
    await idbRequest(store.put(nextRecord));
    return nextRecord;
  });
  if (updated) notifyOutboxListeners();
  return updated;
}

export function subscribeOutbox(listener: OutboxListener): () => void {
  outboxListeners.add(listener);
  return () => {
    outboxListeners.delete(listener);
  };
}

export function onBillEnqueued(listener: EnqueueListener): () => void {
  enqueueListeners.add(listener);
  return () => {
    enqueueListeners.delete(listener);
  };
}
