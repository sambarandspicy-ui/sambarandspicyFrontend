/* eslint-disable @typescript-eslint/no-require-imports -- Install JSDOM and IndexedDB shim before client imports. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { ApiError } from "../src/types/api";
import type { BillDetail, StoreSettings } from "../src/types/domain";
import type { CheckoutInput, PosApiClient } from "../src/services/api/types";

type StoreRecord = Record<string, unknown>;

function createInMemoryIndexedDb(): IDBFactory {
  const databases = new Map<
    string,
    {
      version: number;
      stores: Map<
        string,
        { keyPath: string; rows: Map<IDBValidKey, StoreRecord> }
      >;
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
        get version() {
          return dbMeta!.version;
        },
        objectStoreNames: {
          contains: (storeName: string) => dbMeta!.stores.has(storeName),
          item: (index: number) => [...dbMeta!.stores.keys()][index] ?? null,
          get length() {
            return dbMeta!.stores.size;
          },
        },
        createObjectStore(
          storeName: string,
          options?: IDBObjectStoreParameters,
        ) {
          const keyPath = String(options?.keyPath ?? "id");
          const storeData = { keyPath, rows: new Map<IDBValidKey, StoreRecord>() };
          dbMeta!.stores.set(storeName, storeData);
          return {
            createIndex: () => ({}),
          } as unknown as IDBObjectStore;
        },
        transaction(
          storeNames: string | string[],
          _mode?: IDBTransactionMode,
        ): IDBTransaction {
          void _mode;
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
              const storeMeta = dbMeta!.stores.get(storeName);
              if (!storeMeta) {
                throw new Error(`Store ${storeName} does not exist`);
              }
              const trackRequest = <T,>(executor: () => T) => {
                pending++;
                if (completeTimer !== null) {
                  clearTimeout(completeTimer);
                  completeTimer = null;
                }
                const req = makeRequest(() => {
                  try {
                    return executor();
                  } finally {
                    pending--;
                    queueMicrotask(scheduleFinishCheck);
                  }
                });
                return req;
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

async function main() {
  const { render, screen, fireEvent, waitFor, cleanup, within } = await import(
    "@testing-library/react"
  );
  const { QueryClient, QueryClientProvider, useQueryClient } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { AuthProvider } = require("../src/providers/auth-provider") as typeof import("../src/providers/auth-provider");
  const { QueryProvider } = require("../src/providers/query-provider") as typeof import("../src/providers/query-provider");
  const { BillingWorkspace } = require("../src/components/billing/BillingWorkspace") as typeof import("../src/components/billing/BillingWorkspace");
  const { DailySales } = require("../src/components/layout/daily-sales") as typeof import("../src/components/layout/daily-sales");
  const { api } = require("../src/services/api") as typeof import("../src/services/api");
  const { MockPosApiClient, resetDemoData } = require("../src/services/mock/mockPosApiClient") as typeof import("../src/services/mock/mockPosApiClient");
  const {
    OUTBOX_STORE,
    META_STORE,
    REFERENCE_CACHE_STORE,
    idbRequest,
    idbTransactionDone,
    openOfflineDb,
    resetOfflineDbConnection,
  } = require("../src/services/offline/indexedDb") as typeof import("../src/services/offline/indexedDb");
  const {
    loadCategoriesSnapshot,
    loadMenuSnapshot,
    loadStoreSettingsSnapshot,
  } = require("../src/services/offline/posReferenceCache") as typeof import("../src/services/offline/posReferenceCache");
  const { generateLocalBillNumber, getOrCreateTerminalId } = require("../src/services/offline/localBillCounter") as typeof import("../src/services/offline/localBillCounter");
  const {
    enqueueBill,
    getAllQueuedBills,
    markSyncing,
    recoverStaleSyncingBills,
    removeSyncedBill,
  } = require("../src/services/offline/billingOutbox") as typeof import("../src/services/offline/billingOutbox");
  const { BillingSyncManager } = require("../src/services/offline/billingSyncManager") as typeof import("../src/services/offline/billingSyncManager");

  // 0. Schema v1 -> v2 upgrade preserves existing billing_outbox records while adding reference_cache
  const legacyV1Req = indexedDB.open("sambar_spicy_pos_offline", 1);
  legacyV1Req.onupgradeneeded = () => {
    const legacyDb = legacyV1Req.result;
    if (!legacyDb.objectStoreNames.contains(OUTBOX_STORE)) {
      legacyDb.createObjectStore(OUTBOX_STORE, { keyPath: "clientBillId" });
    }
    if (!legacyDb.objectStoreNames.contains(META_STORE)) {
      legacyDb.createObjectStore(META_STORE, { keyPath: "key" });
    }
  };
  const legacyDb = await idbRequest(legacyV1Req);
  const seedTx = legacyDb.transaction(OUTBOX_STORE, "readwrite");
  await idbRequest(
    seedTx.objectStore(OUTBOX_STORE).put({
      clientBillId: "legacy-v1-bill",
      payload: {
        checkout_key: "00000000-0000-4000-8000-000000000001",
        items: [{ menu_item_id: 1, portion: "FULL", quantity: 1 }],
        payment_method: "CASH",
        tendered_amount: 70,
        clientBillId: "legacy-v1-bill",
      },
      localBill: { id: -1, bill_number: "AAA-261125-0001", status: "PAID", total_amount: 70 },
      syncStatus: "PENDING",
      attemptCount: 0,
      lastError: null,
      createdAt: "2026-11-25T10:00:00.000Z",
    }),
  );
  await idbTransactionDone(seedTx);
  legacyDb.close();
  resetOfflineDbConnection();

  const upgradedDb = await openOfflineDb();
  assert.equal(upgradedDb.version, 2);
  assert.equal(upgradedDb.objectStoreNames.contains(OUTBOX_STORE), true);
  assert.equal(upgradedDb.objectStoreNames.contains(META_STORE), true);
  assert.equal(upgradedDb.objectStoreNames.contains(REFERENCE_CACHE_STORE), true);
  const preservedBills = await getAllQueuedBills();
  assert.equal(preservedBills.length, 1);
  assert.equal(preservedBills[0].clientBillId, "legacy-v1-bill");
  await removeSyncedBill("legacy-v1-bill");

  // 1. Local bill number format & atomic daily counter
  const terminalId = await getOrCreateTerminalId();
  assert.match(terminalId, /^[A-Z0-9]{3}$/);
  const billNo1 = await generateLocalBillNumber(new Date("2026-11-26T05:00:00.000Z"));
  const billNo2 = await generateLocalBillNumber(new Date("2026-11-26T05:01:00.000Z"));
  assert.equal(billNo1, `${terminalId}-261126-0001`);
  assert.equal(billNo2, `${terminalId}-261126-0002`);
  assert.match(billNo1, /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/);

  // 2. Outbox boot recovery & SyncManager error classification
  const basePayload: CheckoutInput = {
    checkout_key: "11111111-1111-4111-8111-111111111111",
    items: [{ menu_item_id: 1, portion: "FULL", quantity: 1, expected_unit_price: 70 }],
    payment_method: "CASH",
    tendered_amount: 100,
    clientBillId: "client-1",
    clientBillNumber: billNo1,
    clientCreatedAt: "2026-11-26T05:00:00.000Z",
  };
  const fakeLocalBill = {
    id: -101,
    bill_number: billNo1,
    checkout_key: basePayload.checkout_key,
    client_bill_id: "client-1",
    clientBillId: "client-1",
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
    created_at: "2026-11-26T05:00:00.000Z",
    held_at: null,
    paid_at: "2026-11-26T05:00:00.000Z",
    cancelled_at: null,
    updated_at: "2026-11-26T05:00:00.000Z",
    items: [],
    payment: null,
    cashier_name: "Admin",
  } as BillDetail;

  await enqueueBill({
    clientBillId: "client-1",
    payload: basePayload,
    localBill: fakeLocalBill,
    createdAt: "2026-11-26T05:00:00.000Z",
  });
  await markSyncing("client-1");
  assert.equal(await recoverStaleSyncingBills(), 1);
  assert.equal((await getAllQueuedBills())[0].syncStatus, "PENDING");

  await enqueueBill({
    clientBillId: "client-2",
    payload: {
      ...basePayload,
      checkout_key: "22222222-2222-4222-8222-222222222222",
      clientBillId: "client-2",
      clientBillNumber: billNo2,
      clientCreatedAt: "2026-11-26T05:01:00.000Z",
    },
    localBill: { ...fakeLocalBill, id: -102, bill_number: billNo2, clientBillId: "client-2", client_bill_id: "client-2" },
    createdAt: "2026-11-26T05:01:00.000Z",
  });

  // 401 pauses without failing
  const authPauseSync = new BillingSyncManager({
    checkoutBill: async () => {
      throw new ApiError("HTTP_401", "Session expired", 401);
    },
  } as unknown as PosApiClient);
  await authPauseSync.syncNow();
  assert.equal(authPauseSync.getSyncState().pausedForAuth, true);
  assert.equal((await getAllQueuedBills()).every((q) => q.syncStatus === "PENDING"), true);

  // 409 marks client-1 FAILED and still proceeds FIFO to sync client-2!
  const syncedIds: string[] = [];
  const conflictSync = new BillingSyncManager({
    checkoutBill: async (input: CheckoutInput) => {
      if (input.clientBillId === "client-1") {
        throw new ApiError("CONFLICT", "Bill number already exists", 409);
      }
      return { ...fakeLocalBill, id: 500, syncStatus: "SYNCED", clientBillId: input.clientBillId };
    },
  } as unknown as PosApiClient);
  conflictSync.onBillSynced((_bill, clientBillId) => syncedIds.push(clientBillId));
  await conflictSync.syncNow();
  assert.deepEqual(syncedIds, ["client-2"]);
  const remaining = await getAllQueuedBills();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].clientBillId, "client-1");
  assert.equal(remaining[0].syncStatus, "FAILED");
  await removeSyncedBill("client-1");

  // 3. BillingWorkspace instant local-first checkout + DailySales + PastBillsDrawer merge
  const mock = new MockPosApiClient();
  resetDemoData();
  await mock.login("admin", "demo");

  const origCheckout = api.checkoutBill.bind(api);
  const origListBills = api.listBills.bind(api);
  const origGetStore = api.getStoreSettings.bind(api);
  const origGetCategories = api.getCategories.bind(api);
  const origGetMenu = api.getMenuItems.bind(api);
  const origGetHeld = api.getHeldBills.bind(api);
  const origGetCaps = api.getBillingCapabilities.bind(api);
  const origGetMe = api.getMe.bind(api);

  // Delegate read endpoints to mock, but make checkoutBill hang to prove Save payment never blocks on HTTP!
  let networkCheckoutCalls = 0;
  api.getMe = () => mock.getMe();
  api.getStoreSettings = (): Promise<StoreSettings> => mock.getStoreSettings();
  api.getCategories = () => mock.getCategories();
  api.getMenuItems = (p) => mock.getMenuItems(p);
  api.getHeldBills = () => mock.getHeldBills();
  api.getBillingCapabilities = () => mock.getBillingCapabilities();
  api.listBills = (r) => mock.listBills(r);
  api.checkoutBill = () => {
    networkCheckoutCalls++;
    return new Promise<BillDetail>(() => {});
  };

  try {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DailySales />
          <BillingWorkspace />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: "Add Idli Sambar to cart" });
    fireEvent.click(screen.getByRole("button", { name: "Add Idli Sambar to cart" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete & Print" }));
    await screen.findByRole("heading", { name: "Confirm payment" });

    fireEvent.click(screen.getByRole("button", { name: "Save payment" }));

    // Cart clears & toast shows immediately even though api.checkoutBill never resolved!
    await screen.findByText(/Payment saved/);
    await waitFor(() => assert.ok(screen.getByText("Your cart is empty")));

    // Outbox contains the pending/syncing bill and DailySales updates immediately
    const queued = await getAllQueuedBills();
    assert.equal(queued.length, 1);
    assert.equal(queued[0].localBill.total_amount, 70);
    const salesRegion = screen.getByLabelText("Today's sales");
    await waitFor(() => assert.ok(within(salesRegion).getByText("₹140.00")));
    assert.ok(networkCheckoutCalls >= 1);

    // PastBillsDrawer displays the queued bill with Syncing/Pending sync badge
    fireEvent.click(screen.getByRole("button", { name: "Past Bills" }));
    await screen.findByText(queued[0].localBill.bill_number!);
    await screen.findByText(/Pending sync|Syncing/);

    // Reference snapshots were persisted to IndexedDB while online queries resolved
    await waitFor(async () => {
      const [menuSnap, categoriesSnap, storeSnap] = await Promise.all([
        loadMenuSnapshot(),
        loadCategoriesSnapshot(),
        loadStoreSettingsSnapshot(),
      ]);
      assert.ok(menuSnap && menuSnap.data.length > 0 && menuSnap.updatedAt);
      assert.ok(categoriesSnap && categoriesSnap.data.length > 0 && categoriesSnap.updatedAt);
      assert.ok(storeSnap && storeSnap.data.store_name && storeSnap.updatedAt);
    });

    cleanup();
    queryClient.clear();

    // 4. Cold reload offline: QueryProvider + failing network GETs still render & bill from reference_cache
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const offlineError = () => Promise.reject(new ApiError("NETWORK_ERROR", "Offline", 0));
    api.getStoreSettings = offlineError;
    api.getCategories = offlineError;
    api.getMenuItems = offlineError;
    api.getBillingCapabilities = offlineError;
    api.getHeldBills = async () => [];

    let coldQueryClient: InstanceType<typeof QueryClient> | null = null;
    function CaptureColdQueryClient() {
      coldQueryClient = useQueryClient();
      return null;
    }

    render(
      <QueryProvider>
        <CaptureColdQueryClient />
        <AuthProvider>
          <BillingWorkspace />
        </AuthProvider>
      </QueryProvider>,
    );

    await screen.findByRole("button", { name: "Add Idli Sambar to cart" });
    assert.ok(screen.getByRole("button", { name: /Dosas/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add Idli Sambar to cart" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete & Print" }));
    await screen.findByRole("heading", { name: "Confirm payment" });
    fireEvent.click(screen.getByRole("button", { name: "Save payment" }));
    await screen.findByText(/Payment saved/);
    await waitFor(() => assert.equal((screen.getByText("Your cart is empty"), true), true));

    const coldQueued = await getAllQueuedBills();
    assert.equal(coldQueued.length, 2);
    assert.equal(coldQueued.every((q) => Boolean(q.localBill.store_name_snapshot)), true);

    cleanup();
    (coldQueryClient as InstanceType<typeof QueryClient> | null)?.clear();
  } finally {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    api.checkoutBill = origCheckout;
    api.listBills = origListBills;
    api.getStoreSettings = origGetStore;
    api.getCategories = origGetCategories;
    api.getMenuItems = origGetMenu;
    api.getHeldBills = origGetHeld;
    api.getBillingCapabilities = origGetCaps;
    api.getMe = origGetMe;
  }

  dom.window.close();
  console.log("Local-first billing outbox, sync manager, and UI integration passed");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
