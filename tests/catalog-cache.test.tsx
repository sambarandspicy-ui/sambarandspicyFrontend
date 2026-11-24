/* eslint-disable @typescript-eslint/no-require-imports -- Set up the DOM before importing React Query. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Node", "MutationObserver", "File", "FileReader"] as const) {
  Object.defineProperty(globalThis, name, { value: name === "window" ? dom.window : dom.window[name], configurable: true });
}

async function main() {
  const { renderHook, waitFor, act, cleanup } = await import("@testing-library/react");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { useCatalog, useAdmin, queryKeys } = require("../src/hooks/queries") as typeof import("../src/hooks/queries");
  const { api, dataMode } = require("../src/services/api") as typeof import("../src/services/api");
  const { MockPosApiClient, resetDemoData } = require("../src/services/mock/mockPosApiClient") as typeof import("../src/services/mock/mockPosApiClient");
  resetDemoData();
  const mock = new MockPosApiClient();
  await mock.login("admin", "demo");
  let menuReads = 0, categoryReads = 0, auditReads = 0;
  api.getMenuItems = async () => { menuReads++; return mock.getMenuItems(); };
  api.getCategories = async () => { categoryReads++; return mock.getCategories(); };
  api.getUsers = () => mock.getUsers();
  api.getAuditLogs = async () => { auditReads++; return mock.getAuditLogs(); };
  api.updateMenuItem = (id, input) => mock.updateMenuItem(id, input);
  api.uploadMenuItemImage = (id, file) => mock.uploadMenuItemImage(id, file);
  api.updateStoreSettings = (input) => mock.updateStoreSettings(input);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 1000 }, mutations: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const catalog = renderHook(() => useCatalog(), { wrapper });
  await waitFor(() => assert.ok(catalog.result.current.menuItems.data?.length));
  await waitFor(() => assert.ok(catalog.result.current.categories.data?.length));
  const item = catalog.result.current.menuItems.data![0];
  const cacheKey = `sambar-spicy-public-menu-v1:${dataMode}`;
  localStorage.setItem(cacheKey, "old public menu");
  client.setQueryData(["public-menu", dataMode], { menu: "old" });
  await act(async () => { await catalog.result.current.updateMenuItem.mutateAsync({ id: item.id, input: { is_available: !item.is_available } }); });
  await waitFor(() => assert.equal(catalog.result.current.menuItems.data?.find((x) => x.id === item.id)?.is_available, !item.is_available));
  assert.equal(menuReads, 1, "saving should not require a menu reload");
  assert.equal(categoryReads, 1, "saving a dish should not reload categories");
  assert.equal(client.getQueryState(queryKeys.menu)?.isInvalidated, true);
  assert.equal(localStorage.getItem(cacheKey), null, "a saved dish must clear the local public menu");
  assert.equal(client.getQueryState(["public-menu", dataMode])?.isInvalidated, true);

  api.updateMenuItem = async () => { throw new Error("Save failed"); };
  localStorage.setItem(cacheKey, "still valid");
  await act(async () => { await assert.rejects(catalog.result.current.updateMenuItem.mutateAsync({ id: item.id, input: { is_available: item.is_available } }), /Save failed/); });
  assert.equal(catalog.result.current.menuItems.data?.find((x) => x.id === item.id)?.is_available, !item.is_available, "failed updates must not change the displayed value");
  assert.equal(localStorage.getItem(cacheKey), "still valid", "a failed save must not clear the public menu");

  const image = new File(["image"], "dish.jpg", { type: "image/jpeg" });
  await act(async () => { await catalog.result.current.uploadMenuItemImage.mutateAsync({ id: item.id, file: image }); });
  await waitFor(() => assert.ok(catalog.result.current.menuItems.data?.find((x) => x.id === item.id)?.image_path));
  assert.equal(menuReads, 1, "uploading an image should not require a menu reload");

  const admin = renderHook(({ showAudit }) => useAdmin(true, showAudit), { wrapper, initialProps: { showAudit: false } });
  await waitFor(() => assert.ok(admin.result.current.users.data));
  localStorage.setItem(cacheKey, "old store");
  await act(async () => { await admin.result.current.updateStore.mutateAsync({ store_name: "Updated shop" }); });
  assert.equal(localStorage.getItem(cacheKey), null, "a saved store must clear the local public menu");
  assert.equal(auditReads, 0);
  admin.rerender({ showAudit: true });
  await waitFor(() => assert.equal(auditReads, 1));
  cleanup();
  client.clear();
  dom.window.close();
  console.log("Catalog cache and audit loading passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
