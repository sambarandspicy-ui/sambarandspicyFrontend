import assert from "node:assert/strict";
import type { PublicMenu } from "../src/types/domain";
import { clearPublicMenuCache, loadPublicMenuCached, PUBLIC_MENU_CACHE_MS } from "../src/services/public-menu-cache";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

async function main() {
  const store = memoryStorage();
  let time = 1_000_000, reads = 0;
  const menu: PublicMenu = { store: { name: "Shop", address: "", phone: "" }, categories: [], items: [] };
  const load = async () => { reads++; return menu; };
  const fetch = () => loadPublicMenuCached(load, "http", store, () => time);
  const initial = await fetch();
  assert.equal(reads, 1);
  assert.equal(initial.expiresAt, time + PUBLIC_MENU_CACHE_MS);
  time += PUBLIC_MENU_CACHE_MS - 1;
  assert.equal((await fetch()).expiresAt, initial.expiresAt, "reopening must not extend the original expiry");
  assert.equal(reads, 1, "fresh browser cache should avoid another request");
  time++;
  await fetch();
  assert.equal(reads, 2, "expired browser cache should fetch a new menu");
  await loadPublicMenuCached(load, "mock", store, () => time);
  assert.equal(reads, 3, "mock and HTTP data must not share a cache");
  store.setItem("sambar-spicy-public-menu-v1:http", "{bad json");
  await fetch();
  assert.equal(reads, 4, "bad cache data must be ignored");
  time -= 1;
  await fetch();
  assert.equal(reads, 5, "future-dated cache must be ignored");
  const blocked = { ...store, getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as Storage;
  assert.equal((await loadPublicMenuCached(load, "http", blocked, () => time)).menu, menu);
  assert.equal(reads, 6, "blocked storage should fall back to the API");
  time += PUBLIC_MENU_CACHE_MS;
  await assert.rejects(loadPublicMenuCached(async () => { throw new Error("offline"); }, "http", store, () => time), /offline/);
  clearPublicMenuCache("http", store);
  let resolvePending!: (value: PublicMenu) => void;
  const pending = loadPublicMenuCached(() => new Promise(resolve => { resolvePending = resolve; }), "http", store, () => time);
  clearPublicMenuCache("http", store);
  resolvePending(menu);
  await pending;
  assert.equal(store.getItem("sambar-spicy-public-menu-v1:http"), null, "a stale in-flight response must not restore a cleared cache");
  console.log("Public menu browser cache expiry and fallback passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
