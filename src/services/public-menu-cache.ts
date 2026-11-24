import type { PublicMenu } from "@/types/domain";

export const PUBLIC_MENU_CACHE_MS = 5 * 60_000;
const CACHE_PREFIX = "sambar-spicy-public-menu-v1:";
const MAX_CACHE_CHARS = 512_000;
const invalidations = new Map<string, number>();
export type CachedPublicMenu = { menu: PublicMenu; expiresAt: number };

function validMenu(value: unknown): value is PublicMenu {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<PublicMenu>;
  const optionalText = (value: unknown) => value == null || typeof value === "string";
  return !!data.store && typeof data.store.name === "string" &&
    typeof data.store.address === "string" && typeof data.store.phone === "string" &&
    Array.isArray(data.categories) && Array.isArray(data.items) &&
    data.categories.every(category => category && typeof category.id === "number" && typeof category.name === "string" && optionalText(category.imagePath)) &&
    data.items.every(item => item && typeof item.id === "number" && typeof item.categoryId === "number" &&
      typeof item.name === "string" && optionalText(item.description) && optionalText(item.imagePath) &&
      ["UNSPECIFIED", "VEG", "NON_VEG", "EGG"].includes(item.dietaryType) &&
      typeof item.sellingPrice === "number" && Number.isFinite(item.sellingPrice) &&
      typeof item.hasHalfPortion === "boolean" && (item.halfSellingPrice == null ||
        (typeof item.halfSellingPrice === "number" && Number.isFinite(item.halfSellingPrice))));
}

/** Only public menu data is stored; a bad, expired or inaccessible cache is ignored. */
export async function loadPublicMenuCached(
  load: () => Promise<PublicMenu>,
  mode: string,
  storage: Storage | null,
  now: () => number = Date.now,
): Promise<CachedPublicMenu> {
  const key = CACHE_PREFIX + mode;
  const version = invalidations.get(mode) ?? 0;
  try {
    const raw = storage?.getItem(key);
    if (raw && raw.length <= MAX_CACHE_CHARS) {
      const cached = JSON.parse(raw) as { savedAt?: unknown; menu?: unknown };
      const time = now();
      if (typeof cached.savedAt === "number" && Number.isFinite(cached.savedAt) &&
          cached.savedAt <= time && time - cached.savedAt < PUBLIC_MENU_CACHE_MS && validMenu(cached.menu))
        return { menu: cached.menu, expiresAt: cached.savedAt + PUBLIC_MENU_CACHE_MS };
    }
  } catch {
    // Storage may be disabled, full or malformed. Continue with the API.
  }
  const menu = await load();
  const savedAt = now();
  try {
    const serialised = JSON.stringify({ savedAt, menu });
    if ((invalidations.get(mode) ?? 0) === version) {
      if (serialised.length <= MAX_CACHE_CHARS) storage?.setItem(key, serialised);
      else storage?.removeItem(key);
    }
  } catch {
    // The menu still works when the browser cannot persist it.
  }
  return { menu, expiresAt: savedAt + PUBLIC_MENU_CACHE_MS };
}

export function browserStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; }
  catch { return null; }
}

export function clearPublicMenuCache(mode: string, storage: Storage | null) {
  invalidations.set(mode, (invalidations.get(mode) ?? 0) + 1);
  try { storage?.removeItem(CACHE_PREFIX + mode); } catch {}
}
