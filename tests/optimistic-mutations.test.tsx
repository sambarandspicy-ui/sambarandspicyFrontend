/* eslint-disable @typescript-eslint/no-require-imports -- Set up JSDOM and IndexedDB shim before client imports. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import type { BillDetail, Notification, OperatingExpense } from "../src/types/domain";
import { ApiError } from "../src/types/api";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "Element",
  "Event",
  "CustomEvent",
  "NodeFilter",
  "Node",
  "getComputedStyle",
  "MutationObserver",
  "File",
  "FileReader",
] as const) {
  Object.defineProperty(globalThis, name, {
    value: name === "window" ? dom.window : dom.window[name],
    configurable: true,
  });
}
Object.defineProperty(globalThis, "self", { value: dom.window, configurable: true });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function main() {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);

  const { renderHook, waitFor, act, cleanup } = await import("@testing-library/react");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const {
    queryKeys,
    useBilling,
    useCatalog,
    useInventory,
    useNotifications,
    useReports,
  } = require("../src/hooks/queries") as typeof import("../src/hooks/queries");
  const { validateUploadImageFile } = require("../src/components/admin/ImagePicker") as typeof import("../src/components/admin/ImagePicker");
  const { api } = require("../src/services/api") as typeof import("../src/services/api");
  const { MockPosApiClient, resetDemoData } = require("../src/services/mock/mockPosApiClient") as typeof import("../src/services/mock/mockPosApiClient");

  resetDemoData();
  const mock = new MockPosApiClient();
  await mock.login("admin", "demo");

  const origUpdateMenu = api.updateMenuItem.bind(api);
  const origUpdateCategory = api.updateCategory.bind(api);
  const origHoldBill = api.holdBill.bind(api);
  const origGetHeldBills = api.getHeldBills.bind(api);
  const origCancelHeld = api.cancelHeldBill.bind(api);
  const origGetMenuItems = api.getMenuItems.bind(api);
  const origGetCategories = api.getCategories.bind(api);
  const origGetNotifications = api.getNotifications.bind(api);
  const origMarkRead = api.markNotificationRead.bind(api);
  const origGetInventory = api.getInventoryItems.bind(api);
  const origGetPurchases = api.getPurchases.bind(api);
  const origGetDaily = api.getDailyEntries.bind(api);
  const origGetMovements = api.getStockMovements.bind(api);
  const origCreateDaily = api.createDailyEntry.bind(api);
  const origGetExpenses = api.getOperatingExpenses.bind(api);
  const origCreateExpense = api.createOperatingExpense.bind(api);
  const origGetSummary = api.getFinancialSummary.bind(api);
  const origGetLedger = api.getSalesLedger.bind(api);
  const origGetMenuSales = api.getMenuItemSales.bind(api);
  const origGetInvSummary = api.getInventorySummary.bind(api);
  const origGetWaste = api.getWasteAnalysis.bind(api);

  api.getMenuItems = () => mock.getMenuItems();
  api.getCategories = () => mock.getCategories();
  api.getHeldBills = () => mock.getHeldBills();
  api.getNotifications = () => mock.getNotifications();
  api.getInventoryItems = () => mock.getInventoryItems();
  api.getPurchases = () => mock.getPurchases();
  api.getDailyEntries = () => mock.getDailyEntries();
  api.getStockMovements = () => mock.getStockMovements();
  api.getFinancialSummary = (r) => mock.getFinancialSummary(r);
  api.getSalesLedger = (r) => mock.getSalesLedger(r);
  api.getMenuItemSales = (r) => mock.getMenuItemSales(r);
  api.getInventorySummary = (r) => mock.getInventorySummary(r);
  api.getWasteAnalysis = (r) => mock.getWasteAnalysis(r);
  api.getOperatingExpenses = (r) => mock.getOperatingExpenses(r);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  try {
    // 1. Menu availability toggle: immediate optimistic update + rollback on server error
    const catalog = renderHook(() => useCatalog(), { wrapper });
    await waitFor(() => assert.ok(catalog.result.current.menuItems.data?.length));
    await waitFor(() => assert.ok(catalog.result.current.categories.data?.length));

    const firstDish = catalog.result.current.menuItems.data![0];
    const initialAvailable = firstDish.is_available;
    const menuToggleDeferred = deferred<typeof firstDish>();
    api.updateMenuItem = () => menuToggleDeferred.promise;

    let menuPromise: Promise<unknown>;
    act(() => {
      menuPromise = catalog.result.current.updateMenuItem.mutateAsync({
        id: firstDish.id,
        input: { is_available: !initialAvailable },
      });
    });

    await waitFor(() =>
      assert.equal(
        catalog.result.current.menuItems.data?.find((x) => x.id === firstDish.id)?.is_available,
        !initialAvailable,
      ),
    );

    menuToggleDeferred.reject(new ApiError("SERVER_ERROR", "Menu toggle failed", 500));
    await assert.rejects(() => menuPromise!, /Menu toggle failed/);
    await waitFor(() =>
      assert.equal(
        catalog.result.current.menuItems.data?.find((x) => x.id === firstDish.id)?.is_available,
        initialAvailable,
      ),
    );

    // 2. Category toggle: immediate optimistic update + rollback on failure
    const firstCat = catalog.result.current.categories.data![0];
    const catToggleDeferred = deferred<typeof firstCat>();
    api.updateCategory = () => catToggleDeferred.promise;
    let catPromise: Promise<unknown>;
    act(() => {
      catPromise = catalog.result.current.updateCategory.mutateAsync({
        id: firstCat.id,
        input: { is_active: !firstCat.is_active },
      });
    });
    await waitFor(() =>
      assert.equal(
        catalog.result.current.categories.data?.find((c) => c.id === firstCat.id)?.is_active,
        !firstCat.is_active,
      ),
    );
    catToggleDeferred.reject(new ApiError("SERVER_ERROR", "Category toggle failed", 500));
    await assert.rejects(() => catPromise!, /Category toggle failed/);
    await waitFor(() =>
      assert.equal(
        catalog.result.current.categories.data?.find((c) => c.id === firstCat.id)?.is_active,
        firstCat.is_active,
      ),
    );

    // 3. Hold bill & Cancel held bill: optimistic remove + rollback on failure
    const billing = renderHook(() => useBilling(), { wrapper });
    await waitFor(() => assert.ok(billing.result.current.held.data !== undefined));
    const heldBeforeCount = billing.result.current.held.data!.length;
    const holdDeferred = deferred<BillDetail>();
    api.holdBill = () => holdDeferred.promise;

    let holdPromise: Promise<BillDetail>;
    act(() => {
      holdPromise = billing.result.current.hold.mutateAsync({
        hold_label: "Counter #7",
        items: [{ menu_item_id: firstDish.id, quantity: 2 }],
      });
    });
    await waitFor(() => assert.equal(billing.result.current.held.data!.length, heldBeforeCount + 1));
    assert.equal(billing.result.current.held.data![0].hold_label, "Counter #7");

    holdDeferred.reject(new ApiError("SERVER_ERROR", "Hold failed", 500));
    await assert.rejects(() => holdPromise!, /Hold failed/);
    await waitFor(() => assert.equal(billing.result.current.held.data!.length, heldBeforeCount));

    // Now seed one real held bill, then verify optimistic cancelHeldBill + rollback
    api.holdBill = (input) => mock.holdBill(input);
    const createdHeld = await billing.result.current.hold.mutateAsync({
      hold_label: "Cancel target",
      items: [{ menu_item_id: firstDish.id, quantity: 1 }],
    });
    await waitFor(() =>
      assert.ok(billing.result.current.held.data?.some((b) => b.id === createdHeld.id)),
    );

    const cancelDeferred = deferred<BillDetail>();
    api.cancelHeldBill = () => cancelDeferred.promise;
    let cancelPromise: Promise<BillDetail>;
    act(() => {
      cancelPromise = billing.result.current.cancel.mutateAsync({
        id: createdHeld.id,
        reason: "Customer left",
      });
    });

    await waitFor(() =>
      assert.equal(
        billing.result.current.held.data?.some((b) => b.id === createdHeld.id),
        false,
      ),
    );

    cancelDeferred.reject(new ApiError("SERVER_ERROR", "Cancel failed", 500));
    await assert.rejects(() => cancelPromise!, /Cancel failed/);
    await waitFor(() =>
      assert.equal(
        billing.result.current.held.data?.some((b) => b.id === createdHeld.id),
        true,
      ),
    );

    // 4. Mark notification read: mutate() (non-async) + rollback without unhandled rejection
    const seededNotification: Notification = {
      id: 901,
      inventory_item_id: 1,
      severity: "WARNING",
      status: "OPEN",
      message: "Low oil",
      triggered_qty: 2,
      created_at: "2026-11-26T00:00:00Z",
      last_notified_at: "2026-11-26T00:00:00Z",
      read_by: null,
      read_at: null,
      resolved_at: null,
      open_inventory_item_id: 1,
    };
    api.getNotifications = async () => [seededNotification];
    const notifHook = renderHook(() => useNotifications(true), { wrapper });
    await waitFor(() => assert.equal(notifHook.result.current.notifications.data?.length, 1));
    const readDeferred = deferred<Notification>();
    api.markNotificationRead = () => readDeferred.promise;
    act(() => {
      notifHook.result.current.markRead.mutate(901);
    });
    await waitFor(() =>
      assert.ok(notifHook.result.current.notifications.data?.[0].read_at !== null),
    );
    readDeferred.reject(new ApiError("SERVER_ERROR", "Mark read failed", 500));
    await waitFor(() =>
      assert.equal(notifHook.result.current.notifications.data?.[0].read_at, null),
    );

    // 5. Daily stock entry & Add expense optimistic update + rollback
    const invHook = renderHook(() => useInventory(), { wrapper });
    await waitFor(() => assert.ok(invHook.result.current.items.data?.length));
    const stockItem = invHook.result.current.items.data![0];
    const startQty = stockItem.current_qty;
    const dailyDeferred = deferred<never>();
    api.createDailyEntry = () => dailyDeferred.promise;
    let dailyPromise: Promise<unknown>;
    act(() => {
      dailyPromise = invHook.result.current.dailyEntry.mutateAsync({
        business_date: "2026-11-26",
        inventory_item_id: stockItem.id,
        used_qty: 1,
        wasted_qty: 0.5,
      });
    });
    await waitFor(() =>
      assert.equal(
        invHook.result.current.items.data?.find((i) => i.id === stockItem.id)?.current_qty,
        Math.max(0, Math.round((startQty - 1.5) * 1000) / 1000),
      ),
    );
    dailyDeferred.reject(new ApiError("SERVER_ERROR", "Stock entry failed", 500));
    await assert.rejects(() => dailyPromise!, /Stock entry failed/);
    await waitFor(() =>
      assert.equal(
        invHook.result.current.items.data?.find((i) => i.id === stockItem.id)?.current_qty,
        startQty,
      ),
    );

    const range = { from: "2026-11-01", to: "2026-11-30" };
    const reportsHook = renderHook(() => useReports(range), { wrapper });
    await waitFor(() => assert.ok(reportsHook.result.current.expenses.data !== undefined));
    const baseExpenseCount = reportsHook.result.current.expenses.data!.length;
    const expDeferred = deferred<OperatingExpense>();
    api.createOperatingExpense = () => expDeferred.promise;
    let expPromise: Promise<OperatingExpense>;
    act(() => {
      expPromise = reportsHook.result.current.createExpense.mutateAsync({
        business_date: "2026-11-26",
        expense_category: "GAS",
        description: "Refill cylinder",
        amount: 950,
      });
    });
    await waitFor(() =>
      assert.equal(reportsHook.result.current.expenses.data!.length, baseExpenseCount + 1),
    );
    expDeferred.reject(new ApiError("SERVER_ERROR", "Expense failed", 500));
    await assert.rejects(() => expPromise!, /Expense failed/);
    await waitFor(() =>
      assert.equal(reportsHook.result.current.expenses.data!.length, baseExpenseCount),
    );

    // 6. Image upload pre-validation matches backend FileStorageService (<100KB + extension)
    assert.ok(validateUploadImageFile({ name: "dish.gif", type: "image/gif", size: 500 }));
    assert.ok(validateUploadImageFile({ name: "dish.bmp", type: "image/png", size: 500 }));
    assert.ok(validateUploadImageFile({ name: "dish.png", type: "image/png", size: 0 }));
    assert.ok(validateUploadImageFile({ name: "dish.jpg", type: "image/jpeg", size: 100_000 }));
    assert.equal(validateUploadImageFile({ name: "dish.jpg", type: "image/jpeg", size: 99_999 }), null);

    // Allow microtasks to settle and verify zero unhandled rejections
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(unhandled.length, 0, "Rollbacks must not produce unhandled rejections");
    assert.equal(queryKeys.menu[0], "menu");
  } finally {
    process.off("unhandledRejection", onUnhandled);
    cleanup();
    client.clear();
    api.updateMenuItem = origUpdateMenu;
    api.updateCategory = origUpdateCategory;
    api.holdBill = origHoldBill;
    api.getHeldBills = origGetHeldBills;
    api.cancelHeldBill = origCancelHeld;
    api.getMenuItems = origGetMenuItems;
    api.getCategories = origGetCategories;
    api.getNotifications = origGetNotifications;
    api.markNotificationRead = origMarkRead;
    api.getInventoryItems = origGetInventory;
    api.getPurchases = origGetPurchases;
    api.getDailyEntries = origGetDaily;
    api.getStockMovements = origGetMovements;
    api.createDailyEntry = origCreateDaily;
    api.getOperatingExpenses = origGetExpenses;
    api.createOperatingExpense = origCreateExpense;
    api.getFinancialSummary = origGetSummary;
    api.getSalesLedger = origGetLedger;
    api.getMenuItemSales = origGetMenuSales;
    api.getInventorySummary = origGetInvSummary;
    api.getWasteAnalysis = origGetWaste;
    dom.window.close();
  }

  console.log("Optimistic mutations and rollback checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
