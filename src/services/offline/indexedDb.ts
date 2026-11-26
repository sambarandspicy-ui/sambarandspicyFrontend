const DB_NAME = "sambar_spicy_pos_offline";
const DB_VERSION = 2;

export const OUTBOX_STORE = "billing_outbox";
export const META_STORE = "meta";
export const REFERENCE_CACHE_STORE = "reference_cache";

export type OfflineStoreName =
  | typeof OUTBOX_STORE
  | typeof META_STORE
  | typeof REFERENCE_CACHE_STORE;

export interface MetaEntry<T = unknown> {
  key: string;
  value: T;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDbAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof indexedDB !== "undefined" &&
    indexedDB !== null
  );
}

export function resetOfflineDbConnection(): void {
  dbPromise = null;
}

export function openOfflineDb(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(
      new Error("IndexedDB is unavailable in the current environment."),
    );
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, {
          keyPath: "clientBillId",
        });
        outbox.createIndex("by_createdAt", "createdAt", { unique: false });
        outbox.createIndex("by_syncStatus", "syncStatus", { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(REFERENCE_CACHE_STORE)) {
        db.createObjectStore(REFERENCE_CACHE_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Failed to open IndexedDB."));
    };

    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB upgrade was blocked by another tab."));
    };
  });

  return dbPromise;
}

export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

export function idbTransactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted."));
    tx.onerror = () =>
      reject(tx.error ?? new Error("IndexedDB transaction failed."));
  });
}

export async function withStore<T>(
  storeName: OfflineStoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openOfflineDb();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  const result = await fn(store, tx);
  await idbTransactionDone(tx);
  return result;
}
