import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/types/api";
import type { Category, MenuItem, StoreSettings } from "@/types/domain";
import {
  REFERENCE_CACHE_STORE,
  idbRequest,
  isIndexedDbAvailable,
  withStore,
} from "./indexedDb";

export type ReferenceCacheKey =
  | "menu_items"
  | "categories"
  | "store_settings"
  | "billing_capabilities";

export interface ReferenceSnapshot<T = unknown> {
  key: ReferenceCacheKey;
  data: T;
  updatedAt: string;
}

export const REFERENCE_STALE_TIME_MS = 5 * 60 * 1000;
export const REFERENCE_GC_TIME_MS = 24 * 60 * 60 * 1000;

export function isOfflineOrNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (
      error.status === 0 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 504 ||
      error.code === "NETWORK_ERROR" ||
      error.code === "TIMEOUT"
    );
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("failed to fetch") ||
      message.includes("network") ||
      message.includes("offline") ||
      message.includes("load failed") ||
      message.includes("fetch failed")
    );
  }
  return false;
}

export async function saveReferenceSnapshot<T>(
  key: ReferenceCacheKey,
  data: T,
): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const snapshot: ReferenceSnapshot<T> = {
      key,
      data,
      updatedAt: new Date().toISOString(),
    };
    await withStore(REFERENCE_CACHE_STORE, "readwrite", async (store) => {
      await idbRequest(store.put(snapshot));
    });
  } catch {
    // Reference cache persistence must never break live POS requests.
  }
}

export async function loadReferenceSnapshot<T>(
  key: ReferenceCacheKey,
): Promise<ReferenceSnapshot<T> | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    return await withStore(REFERENCE_CACHE_STORE, "readonly", async (store) => {
      const result = await idbRequest(
        store.get(key) as IDBRequest<ReferenceSnapshot<T> | undefined>,
      );
      return result ?? null;
    });
  } catch {
    return null;
  }
}

export async function saveMenuSnapshot(items: MenuItem[]): Promise<void> {
  await saveReferenceSnapshot("menu_items", items);
}

export async function loadMenuSnapshot(): Promise<ReferenceSnapshot<MenuItem[]> | null> {
  return loadReferenceSnapshot<MenuItem[]>("menu_items");
}

export async function saveCategoriesSnapshot(
  categories: Category[],
): Promise<void> {
  await saveReferenceSnapshot("categories", categories);
}

export async function loadCategoriesSnapshot(): Promise<ReferenceSnapshot<Category[]> | null> {
  return loadReferenceSnapshot<Category[]>("categories");
}

export async function saveStoreSettingsSnapshot(
  settings: StoreSettings,
): Promise<void> {
  await saveReferenceSnapshot("store_settings", settings);
}

export async function loadStoreSettingsSnapshot(): Promise<ReferenceSnapshot<StoreSettings> | null> {
  return loadReferenceSnapshot<StoreSettings>("store_settings");
}

export async function fetchWithReferenceFallback<T>(
  key: ReferenceCacheKey,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const fresh = await fetcher();
    void saveReferenceSnapshot(key, fresh);
    return fresh;
  } catch (error) {
    if (isOfflineOrNetworkError(error)) {
      const cached = await loadReferenceSnapshot<T>(key);
      if (cached !== null) {
        return cached.data;
      }
    }
    throw error;
  }
}

const REFERENCE_QUERY_ENTRIES: ReadonlyArray<{
  cacheKey: ReferenceCacheKey;
  queryKey: readonly string[];
}> = [
  { cacheKey: "store_settings", queryKey: ["store"] },
  { cacheKey: "categories", queryKey: ["categories"] },
  { cacheKey: "menu_items", queryKey: ["menu"] },
  { cacheKey: "billing_capabilities", queryKey: ["bills", "capabilities"] },
];

/**
 * Populates React Query with IndexedDB snapshots on cold boot using an old
 * `updatedAt` timestamp so online sessions still revalidate in the background
 * while offline sessions render immediately.
 */
export async function hydrateReferenceQueries(client: QueryClient): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  await Promise.all(
    REFERENCE_QUERY_ENTRIES.map(async ({ cacheKey, queryKey }) => {
      const snapshot = await loadReferenceSnapshot(cacheKey);
      if (snapshot === null) return;
      if (client.getQueryData(queryKey) === undefined) {
        client.setQueryData(queryKey, snapshot.data, { updatedAt: 1 });
      }
    }),
  );
}
