/* eslint-disable @typescript-eslint/no-require-imports -- Install JSDOM and IndexedDB shim before client imports. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { ApiError } from "../src/types/api";
import type { BillDetail } from "../src/types/domain";
import type { CheckoutInput } from "../src/services/api/types";

type StoreRecord = Record<string, unknown>;

function createInMemoryIndexedDb(): IDBFactory {
  const databases = new Map<
    string,
    {
      version: number;
      stores: Map<string, { keyPath: string; rows: Map<IDBValidKey, StoreRecord> }>;
    }
  >();

  function makeRequest<T>(executor: () => T): IDBRequest<T> {
    const req: {
      result?: T;
      error: DOMException | null;
      readyState: IDBRequestReadyState;
      onsuccess: ((ev: Event) => void) | null;
      onerror: ((ev: Event) => void) | null;
      source: unknown;
      transaction: IDBTransaction | null;
      addEventListener: () => void;
      removeEventListener: () => void;
      dispatchEvent: () => boolean;
    } = {
      result: undefined,
      error: null,
      readyState: "pending",
      onsuccess: null,
      onerror: null,
      source: null,
      transaction: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };

    queueMicrotask(() => {
      try {
        req.result = executor();
        req.readyState = "done";
        req.onsuccess?.(new Event("success"));
      } catch (err) {
        req.error = err as DOMException;
        req.readyState = "done";
        req.onerror?.(new Event("error"));
      }
    });
    return req as unknown as IDBRequest<T>;
  }

  return {
    open(name: string, version = 1): IDBOpenDBRequest {
      let dbMeta = databases.get(name);
      const needsUpgrade = !dbMeta || dbMeta.version < version;
      if (!dbMeta) {
        dbMeta = { version, stores: new Map() };
        databases.set(name, dbMeta);
      }

      const dbObj = {
        name,
        version: dbMeta.version,
        objectStoreNames: {
          contains: (storeName: string) => dbMeta!.stores.has(storeName),
          item: (index: number) => [...dbMeta!.stores.keys()][index] ?? null,
          get length() {
            return dbMeta!.stores.size;
          },
        },
        createObjectStore(storeName: string, options?: IDBObjectStoreParameters) {
          const keyPath = String(options?.keyPath ?? "id");
          const storeData = { keyPath, rows: new Map<IDBValidKey, StoreRecord>() };
          dbMeta!.stores.set(storeName, storeData);
          return { createIndex: () => ({}) } as unknown as IDBObjectStore;
        },
        transaction(storeNames: string | string[]): IDBTransaction {
          const names = Array.isArray(storeNames) ? storeNames : [storeNames];
          let pending = 0;
          let completeTimer: ReturnType<typeof setTimeout> | null = null;
          const scheduleFinishCheck = () => {
            if (completeTimer !== null) {
              clearTimeout(completeTimer);
              completeTimer = null;
            }
            if (pending === 0) {
              completeTimer = setTimeout(() => {
                completeTimer = null;
                if (pending === 0) {
                  tx.oncomplete?.(new Event("complete"));
                }
              }, 0);
            }
          };
          const tx = {
            oncomplete: null as ((ev: Event) => void) | null,
            onerror: null as ((ev: Event) => void) | null,
            onabort: null as ((ev: Event) => void) | null,
            objectStore(storeName: string): IDBObjectStore {
              if (!names.includes(storeName)) {
                throw new Error(`Store ${storeName} not in transaction`);
              }
              const storeMeta = dbMeta!.stores.get(storeName)!;
              const trackRequest = <T,>(executor: () => T) => {
                pending++;
                if (completeTimer !== null) {
                  clearTimeout(completeTimer);
                  completeTimer = null;
                }
                return makeRequest(() => {
                  try {
                    return executor();
                  } finally {
                    pending--;
                    queueMicrotask(scheduleFinishCheck);
                  }
                });
              };
              return {
                get(key: IDBValidKey) {
                  return trackRequest(() => {
                    const row = storeMeta.rows.get(key);
                    return row ? structuredClone(row) : undefined;
                  });
                },
                getAll() {
                  return trackRequest(() =>
                    [...storeMeta.rows.values()].map((r) => structuredClone(r)),
                  );
                },
                put(value: StoreRecord) {
                  return trackRequest(() => {
                    const key = value[storeMeta.keyPath] as IDBValidKey;
                    storeMeta.rows.set(key, structuredClone(value));
                    return key;
                  });
                },
                delete(key: IDBValidKey) {
                  return trackRequest(() => {
                    storeMeta.rows.delete(key);
                    return undefined;
                  });
                },
              } as unknown as IDBObjectStore;
            },
          };
          scheduleFinishCheck();
          return tx as unknown as IDBTransaction;
        },
        close: () => {},
        onversionchange: null,
        onclose: null,
      } as unknown as IDBDatabase;

      const openReq = {
        result: dbObj,
        error: null,
        onupgradeneeded: null as ((ev: IDBVersionChangeEvent) => void) | null,
        onsuccess: null as ((ev: Event) => void) | null,
        onerror: null as ((ev: Event) => void) | null,
        onblocked: null as ((ev: Event) => void) | null,
      };

      queueMicrotask(() => {
        if (needsUpgrade) {
          dbMeta!.version = version;
          openReq.onupgradeneeded?.(
            new Event("upgradeneeded") as IDBVersionChangeEvent,
          );
        }
        openReq.onsuccess?.(new Event("success"));
      });

      return openReq as unknown as IDBOpenDBRequest;
    },
    cmp: (a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0),
    databases: async () => [],
    deleteDatabase: () => ({}) as IDBOpenDBRequest,
  } as IDBFactory;
}

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
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
  "PointerEvent",
  "MouseEvent",
  "KeyboardEvent",
] as const) {
  Object.defineProperty(globalThis, name, {
    value: name === "window" ? dom.window : dom.window[name],
    configurable: true,
  });
}
Object.defineProperty(globalThis, "self", { value: dom.window, configurable: true });
Object.defineProperty(globalThis, "indexedDB", {
  value: createInMemoryIndexedDb(),
  configurable: true,
});

function makeLocalBill(
  clientBillId: string,
  billNumber: string,
  createdAt: string,
): BillDetail {
  return {
    id: -101,
    bill_number: billNumber,
    checkout_key: "11111111-1111-4111-8111-111111111111",
    client_bill_id: clientBillId,
    clientBillId,
    business_date: "2026-11-26",
    status: "PAID",
    hold_label: null,
    item_count: 1,
    subtotal_amount: 70,
    discount_amount: 0,
    round_off_amount: 0,
    total_amount: 70,
    note: null,
    store_name_snapshot: "Sambar & Spicy",
    store_address_snapshot: "",
    store_phone_snapshot: "",
    created_by: 1,
    paid_by: 1,
    cancelled_by: null,
    cancel_reason: null,
    created_at: createdAt,
    held_at: null,
    paid_at: createdAt,
    cancelled_at: null,
    updated_at: createdAt,
    items: [],
    payment: {
      id: -1,
      bill_id: -101,
      payment_method: "CASH",
      amount: 70,
      tendered_amount: 100,
      change_amount: 30,
      reference_number: null,
      recorded_by: 1,
      recorded_at: createdAt,
    },
    cashier_name: "Admin",
  };
}

async function main() {
  const { render, screen, fireEvent, waitFor, cleanup, act, within } = await import(
    "@testing-library/react"
  );
  const { default: userEvent } = await import("@testing-library/user-event");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { AppRouterContext } = require("next/dist/shared/lib/app-router-context.shared-runtime") as typeof import("next/dist/shared/lib/app-router-context.shared-runtime");
  const { PathnameContext } = require("next/dist/shared/lib/hooks-client-context.shared-runtime") as typeof import("next/dist/shared/lib/hooks-client-context.shared-runtime");
  const { AuthProvider } = require("../src/providers/auth-provider") as typeof import("../src/providers/auth-provider");
  const { ThemeProvider } = require("../src/providers/theme-provider") as typeof import("../src/providers/theme-provider");
  const { AppShell } = require("../src/components/layout/app-shell") as typeof import("../src/components/layout/app-shell");
  const { Topbar } = require("../src/components/layout/topbar") as typeof import("../src/components/layout/topbar");
  const { UserMenu } = require("../src/components/layout/user-menu") as typeof import("../src/components/layout/user-menu");
  const { OfflineBanner } = require("../src/components/shared/OfflineBanner") as typeof import("../src/components/shared/OfflineBanner");
  const { PastBillsDrawer } = require("../src/components/billing/PastBillsDrawer") as typeof import("../src/components/billing/PastBillsDrawer");
  const { api } = require("../src/services/api") as typeof import("../src/services/api");
  const { MockPosApiClient, resetDemoData } = require("../src/services/mock/mockPosApiClient") as typeof import("../src/services/mock/mockPosApiClient");
  const {
    enqueueBill,
    getAllQueuedBills,
    markFailed,
    removeSyncedBill,
  } = require("../src/services/offline/billingOutbox") as typeof import("../src/services/offline/billingOutbox");

  const mock = new MockPosApiClient();
  resetDemoData();
  await mock.login("admin", "demo");

  const origGetMe = api.getMe.bind(api);
  const origLogout = api.logout.bind(api);
  const origGetStore = api.getStoreSettings.bind(api);
  const origGetNotifications = api.getNotifications.bind(api);
  const origListBills = api.listBills.bind(api);
  const origCheckout = api.checkoutBill.bind(api);

  api.getMe = () => mock.getMe();
  api.logout = () => mock.logout();
  api.getStoreSettings = () => mock.getStoreSettings();
  api.getNotifications = () => mock.getNotifications();
  api.listBills = (r) => mock.listBills(r);

  const replacedRoutes: string[] = [];
  const routerValue = {
    back() {},
    forward() {},
    refresh() {},
    push() {},
    replace(href: string) {
      replacedRoutes.push(href);
    },
    prefetch() {},
  } as unknown as React.ComponentProps<typeof AppRouterContext.Provider>["value"];

  const makePayload = (clientBillId: string, billNumber: string): CheckoutInput => ({
    checkout_key: `key-${clientBillId}`,
    items: [{ menu_item_id: 1, portion: "FULL", quantity: 1, expected_unit_price: 70 }],
    payment_method: "CASH",
    tendered_amount: 100,
    clientBillId,
    clientBillNumber: billNumber,
    clientCreatedAt: "2026-11-26T05:00:00.000Z",
  });

  try {
    // Keep offline during pill & guardrail checks so background sync doesn't drain immediately
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    await enqueueBill({
      clientBillId: "ui-pending-1",
      payload: makePayload("ui-pending-1", "C7K-261126-0001"),
      localBill: makeLocalBill("ui-pending-1", "C7K-261126-0001", "2026-11-26T05:00:00.000Z"),
      createdAt: "2026-11-26T05:00:00.000Z",
    });

    const qc1 = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={qc1}>
        <AppRouterContext.Provider value={routerValue}>
          <PathnameContext.Provider value="/admin">
            <ThemeProvider>
              <AuthProvider>
                <OfflineBanner />
                <Topbar title="Admin" onMenu={() => {}} />
              </AuthProvider>
            </ThemeProvider>
          </PathnameContext.Provider>
        </AppRouterContext.Provider>
      </QueryClientProvider>,
    );

    // 1. OfflineBanner shows reassuring copy + queued count + keeps /You are offline/
    await screen.findByText(/You are offline/);
    await screen.findByText(/billing & printing continue normally/i);
    await screen.findByText(/1 bill queued for auto-sync/i);

    // 2. Topbar shows "1 pending" pill and opens SyncQueueDialog on click
    const pendingPill = await screen.findByRole("button", { name: "Open offline sync queue" });
    assert.match(pendingPill.textContent ?? "", /1 pending/);

    // Transition bill to FAILED and verify red pill + SyncQueueDialog actions
    await act(async () => {
      await markFailed("ui-pending-1", "Bill number conflict on server");
    });
    const failedPill = await screen.findByRole("button", { name: /1 sync failed/ });
    fireEvent.click(failedPill);
    await screen.findByRole("heading", { name: "Offline Billing Sync Queue" });
    await screen.findByText("Bill number conflict on server");

    // Re-enable online and mock checkout success for retry tests
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    let checkoutAttempts = 0;
    api.checkoutBill = async (input) => {
      checkoutAttempts++;
      if (checkoutAttempts === 1) {
        throw new ApiError("CONFLICT", "Retry still failed", 409);
      }
      return {
        ...makeLocalBill(input.clientBillId!, input.clientBillNumber!, input.clientCreatedAt!),
        id: 777,
        syncStatus: "SYNCED",
      };
    };

    // Per-row Retry triggers retryBill + syncNow (first attempt fails 409, second succeeds)
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retry" }));
    await waitFor(() => assert.equal(checkoutAttempts, 1));
    await screen.findByText("Retry still failed");

    // Retry All Failed triggers retryAllFailed + syncNow -> clears queue!
    fireEvent.click(within(dialog).getByRole("button", { name: "Retry All Failed" }));
    await waitFor(() => assert.equal(checkoutAttempts, 2));
    await screen.findByText("All bills synced");

    cleanup();
    qc1.clear();

    // 3. AppShell beforeunload guardrail attaches when unsynced bills exist & detaches when empty
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    await enqueueBill({
      clientBillId: "ui-guard-1",
      payload: makePayload("ui-guard-1", "C7K-261126-0002"),
      localBill: makeLocalBill("ui-guard-1", "C7K-261126-0002", "2026-11-26T05:05:00.000Z"),
      createdAt: "2026-11-26T05:05:00.000Z",
    });

    const qc2 = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={qc2}>
        <AppRouterContext.Provider value={routerValue}>
          <PathnameContext.Provider value="/billing">
            <ThemeProvider>
              <AuthProvider>
                <AppShell>
                  <p>Shell body</p>
                </AppShell>
              </AuthProvider>
            </ThemeProvider>
          </PathnameContext.Provider>
        </AppRouterContext.Provider>
      </QueryClientProvider>,
    );

    await screen.findByText("Shell body");
    await waitFor(() => {
      const unloadEvent = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(unloadEvent);
      assert.equal(unloadEvent.defaultPrevented, true, "beforeunload must be prevented while unsynced bills exist");
    });

    await act(async () => {
      await removeSyncedBill("ui-guard-1");
    });
    await waitFor(() => {
      const unloadEvent = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(unloadEvent);
      assert.equal(unloadEvent.defaultPrevented, false, "beforeunload must detach once queue drains");
    });

    cleanup();
    qc2.clear();

    // 4. UserMenu Logout Guardrail & PastBillsDrawer failed retry button
    await enqueueBill({
      clientBillId: "ui-logout-1",
      payload: makePayload("ui-logout-1", "C7K-261126-0003"),
      localBill: makeLocalBill("ui-logout-1", "C7K-261126-0003", "2026-11-26T05:06:00.000Z"),
      createdAt: "2026-11-26T05:06:00.000Z",
    });
    await markFailed("ui-logout-1", "Invalid item");

    let receiptOpened = 0;
    const qc3 = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={qc3}>
        <AppRouterContext.Provider value={routerValue}>
          <AuthProvider>
            <PastBillsDrawer open onOpenChange={() => {}} onReceipt={() => { receiptOpened++; }} />
          </AuthProvider>
        </AppRouterContext.Provider>
      </QueryClientProvider>,
    );

    // PastBillsDrawer inline Retry on FAILED bill does not open receipt dialog
    const retryBtn = await screen.findByRole("button", { name: "Retry" });
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    let retriedId = "";
    api.checkoutBill = async (input) => {
      retriedId = input.clientBillId ?? "";
      throw new ApiError("CONFLICT", "Still invalid", 409);
    };
    fireEvent.click(retryBtn);
    await waitFor(() => assert.equal(retriedId, "ui-logout-1"));
    assert.equal(receiptOpened, 0);
    cleanup();
    qc3.clear();

    // Clicking Logout while unsynced bills exist opens ConfirmDialog warning instead of logging out
    const user = userEvent.setup({ document: dom.window.document });
    const qc3b = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={qc3b}>
        <AppRouterContext.Provider value={routerValue}>
          <AuthProvider>
            <UserMenu />
          </AuthProvider>
        </AppRouterContext.Provider>
      </QueryClientProvider>,
    );
    await screen.findByText("admin");
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(await screen.findByText("Logout"));
    await screen.findByText("Unsynced bills on this device");
    assert.ok(await api.getMe(), "User must remain signed in until confirming logout");

    // Confirm "Log out anyway" -> logs out AND preserves IndexedDB queued bills
    fireEvent.click(screen.getByRole("button", { name: "Log out anyway" }));
    await waitFor(() => assert.ok(replacedRoutes.includes("/login")));
    assert.equal(await api.getMe(), null);
    assert.equal((await getAllQueuedBills()).length, 1, "Logout must never clear IndexedDB outbox");

    await removeSyncedBill("ui-logout-1");
    cleanup();
    qc3b.clear();

    // 5. When queue is empty, Logout runs immediately without ConfirmDialog
    await mock.login("admin", "demo");
    replacedRoutes.length = 0;
    const qc4 = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={qc4}>
        <AppRouterContext.Provider value={routerValue}>
          <AuthProvider>
            <UserMenu />
          </AuthProvider>
        </AppRouterContext.Provider>
      </QueryClientProvider>,
    );
    await screen.findByText("admin");
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(await screen.findByText("Logout"));
    await waitFor(() => assert.ok(replacedRoutes.includes("/login")));
    assert.equal(screen.queryByText("Unsynced bills on this device"), null);

    cleanup();
    qc4.clear();
  } finally {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    api.getMe = origGetMe;
    api.logout = origLogout;
    api.getStoreSettings = origGetStore;
    api.getNotifications = origGetNotifications;
    api.listBills = origListBills;
    api.checkoutBill = origCheckout;
  }

  dom.window.close();
  console.log("Billing sync header, recovery dialog, offline banner, and guardrails passed");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
