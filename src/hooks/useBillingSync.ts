"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllQueuedBills,
  type QueuedBillRecord,
  resetFailedToPending,
  resetSingleFailedToPending,
  subscribeOutbox,
} from "@/services/offline/billingOutbox";
import { billingSyncManager } from "@/services/offline/billingSyncManager";

export interface UseBillingSyncResult {
  queuedBills: QueuedBillRecord[];
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  retryBill: (clientBillId: string) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  exportBackupJson: () => Promise<string>;
}

export function useBillingSync(): UseBillingSyncResult {
  const [queuedBills, setQueuedBills] = useState<QueuedBillRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const releaseSync = billingSyncManager.acquire();

    const loadQueue = () => {
      void getAllQueuedBills()
        .then((records) => {
          if (!cancelled) {
            setQueuedBills(records);
          }
        })
        .catch(() => {
          // Keep current state if IndexedDB read fails transiently.
        });
    };

    loadQueue();
    const initialState = billingSyncManager.getSyncState();
    Promise.resolve().then(() => {
      if (!cancelled) {
        setIsSyncing(initialState.isSyncing);
      }
    });

    const unsubOutbox = subscribeOutbox(loadQueue);
    const unsubState = billingSyncManager.subscribeSyncState((state) => {
      if (!cancelled) {
        setIsSyncing(state.isSyncing);
      }
    });

    return () => {
      cancelled = true;
      unsubOutbox();
      unsubState();
      releaseSync();
    };
  }, []);

  const { pendingCount, failedCount } = useMemo(() => {
    let pending = 0;
    let failed = 0;
    for (const record of queuedBills) {
      if (record.syncStatus === "FAILED") {
        failed++;
      } else {
        pending++;
      }
    }
    return { pendingCount: pending, failedCount: failed };
  }, [queuedBills]);

  const syncNow = useCallback(async () => {
    await billingSyncManager.syncNow();
  }, []);

  const retryBill = useCallback(async (clientBillId: string) => {
    await resetSingleFailedToPending(clientBillId);
    await billingSyncManager.syncNow();
  }, []);

  const retryAllFailed = useCallback(async () => {
    await resetFailedToPending();
    await billingSyncManager.syncNow();
  }, []);

  const exportBackupJson = useCallback(async () => {
    const records = await getAllQueuedBills();
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        count: records.length,
        bills: records,
      },
      null,
      2,
    );
  }, []);

  return {
    queuedBills,
    pendingCount,
    failedCount,
    isSyncing,
    syncNow,
    retryBill,
    retryAllFailed,
    exportBackupJson,
  };
}
