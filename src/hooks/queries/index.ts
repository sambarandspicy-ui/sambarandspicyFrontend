"use client";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, dataMode } from "@/services/api";
import { browserStorage, clearPublicMenuCache } from "@/services/public-menu-cache";
import {
  REFERENCE_STALE_TIME_MS,
  fetchWithReferenceFallback,
  saveCategoriesSnapshot,
  saveMenuSnapshot,
  saveStoreSettingsSnapshot,
} from "@/services/offline/posReferenceCache";
import type {
  AdjustmentInput,
  BillInput,
  CategoryInput,
  CheckoutInput,
  DailyEntryInput,
  ExpenseInput,
  InventoryInput,
  MenuItemInput,
  PurchaseInput,
} from "@/services/api/types";
import type {
  BillDetail,
  BillItem,
  Category,
  FinancialSummaryReport,
  InventoryItem,
  MenuItem,
  Notification,
  OperatingExpense,
  PortionSize,
  ReportDateRange,
  SalesTrendPoint,
  StockDailyEntry,
  StockMovement,
  StoreSettings,
  User,
} from "@/types/domain";

export const queryKeys = {
  store: ["store"] as const,
  categories: ["categories"] as const,
  menu: ["menu"] as const,
  bills: ["bills"] as const,
  inventory: ["inventory"] as const,
  purchases: ["purchases"] as const,
  daily: ["daily"] as const,
  movements: ["movements"] as const,
  reports: ["reports"] as const,
  expenses: ["expenses"] as const,
  users: ["users"] as const,
  notifications: ["notifications"] as const,
  audits: ["audits"] as const,
};

function useRefresh() {
  const client = useQueryClient();
  return (...keys: readonly (readonly string[])[]) => {
    for (const queryKey of keys) {
      void client.invalidateQueries({ queryKey });
    }
  };
}

function dateInRange(date: string, range: ReportDateRange | undefined): boolean {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundStock(value: number): number {
  return Math.max(0, Math.round(value * 1000) / 1000);
}

function buildOptimisticHeldBill(
  input: BillInput,
  existing: BillDetail | undefined,
  menu: MenuItem[] | undefined,
): BillDetail {
  const now = new Date().toISOString();
  const billId = input.bill_id ?? -Date.now();
  const lines: BillItem[] = input.items.map((line, index) => {
    const portion: PortionSize = line.portion ?? "FULL";
    const menuMatch = menu?.find((m) => m.id === line.menu_item_id);
    const existingLine = existing?.items.find(
      (i) => i.menu_item_id === line.menu_item_id && (i.portion ?? "FULL") === portion,
    );
    const unitPrice =
      line.expected_unit_price ??
      existingLine?.unit_price ??
      (portion === "HALF"
        ? (menuMatch?.half_selling_price ?? menuMatch?.selling_price ?? 0)
        : (menuMatch?.selling_price ?? 0));
    const lineDiscount = roundMoney(line.line_discount_amount ?? 0);
    const lineTotal = roundMoney(unitPrice * line.quantity);
    const lineNetTotal = roundMoney(lineTotal - lineDiscount);
    return {
      id: existingLine?.id ?? -(index + 1),
      bill_id: billId,
      menu_item_id: line.menu_item_id,
      portion,
      item_name_snapshot:
        existingLine?.item_name_snapshot ?? menuMatch?.name ?? `Item #${line.menu_item_id}`,
      quantity: line.quantity,
      unit_price: unitPrice,
      estimated_unit_cost_snapshot: existingLine?.estimated_unit_cost_snapshot ?? null,
      line_discount_amount: lineDiscount,
      line_total: lineTotal,
      line_net_total: lineNetTotal,
      created_at: existing?.created_at ?? now,
    };
  });

  const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.line_total, 0));
  const discount = roundMoney(lines.reduce((sum, l) => sum + l.line_discount_amount, 0));
  const total = roundMoney(subtotal - discount);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  return {
    id: billId,
    bill_number: null,
    checkout_key: existing?.checkout_key ?? null,
    business_date: existing?.business_date ?? now.slice(0, 10),
    status: "HELD",
    hold_label: input.hold_label ?? existing?.hold_label ?? null,
    item_count: itemCount,
    subtotal_amount: subtotal,
    discount_amount: discount,
    round_off_amount: 0,
    total_amount: total,
    note: input.note ?? existing?.note ?? null,
    store_name_snapshot: existing?.store_name_snapshot ?? null,
    store_address_snapshot: existing?.store_address_snapshot ?? null,
    store_phone_snapshot: existing?.store_phone_snapshot ?? null,
    created_by: existing?.created_by ?? 0,
    paid_by: null,
    cancelled_by: null,
    cancel_reason: null,
    created_at: existing?.created_at ?? now,
    held_at: now,
    paid_at: null,
    cancelled_at: null,
    updated_at: now,
    items: lines,
    payment: null,
  };
}

export function useStoreSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.store,
    queryFn: () => fetchWithReferenceFallback("store_settings", () => api.getStoreSettings()),
    enabled,
    staleTime: REFERENCE_STALE_TIME_MS,
    networkMode: "always",
  });
}

export function useCatalog() {
  const client = useQueryClient();
  const refresh = useRefresh();
  const cancel = (key: readonly string[]) => client.cancelQueries({ queryKey: key });
  const stale = (key: readonly string[]) => {
    void client.invalidateQueries({ queryKey: key, refetchType: "none" });
    clearPublicMenuCache(dataMode, browserStorage());
    void client.invalidateQueries({ queryKey: ["public-menu"] });
    refresh(queryKeys.audits);
  };
  const categorySaved = (row: Category) => {
    const next = client.setQueryData<Category[]>(queryKeys.categories, (old) =>
      old
        ? [...old.filter((x) => x.id !== row.id), row].sort(
            (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
          )
        : old,
    );
    if (next) void saveCategoriesSnapshot(next);
    stale(queryKeys.categories);
  };
  const menuSaved = (row: MenuItem) => {
    const next = client.setQueryData<MenuItem[]>(queryKeys.menu, (old) =>
      old
        ? [...old.filter((x) => x.id !== row.id), row].sort(
            (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
          )
        : old,
    );
    if (next) void saveMenuSnapshot(next);
    stale(queryKeys.menu);
  };
  return {
    categories: useQuery({
      queryKey: queryKeys.categories,
      queryFn: () => fetchWithReferenceFallback("categories", () => api.getCategories()),
      staleTime: REFERENCE_STALE_TIME_MS,
      networkMode: "always",
    }),
    menuItems: useQuery({
      queryKey: queryKeys.menu,
      queryFn: () => fetchWithReferenceFallback("menu_items", () => api.getMenuItems()),
      staleTime: REFERENCE_STALE_TIME_MS,
      networkMode: "always",
    }),
    createCategory: useMutation({
      mutationFn: (x: CategoryInput) => api.createCategory(x),
      onMutate: () => cancel(queryKeys.categories),
      onSuccess: categorySaved,
    }),
    updateCategory: useMutation({
      mutationFn: ({ id, input }: { id: number; input: Partial<CategoryInput> }) =>
        api.updateCategory(id, input),
      onMutate: async ({ id, input }) => {
        await cancel(queryKeys.categories);
        const previous = client.getQueryData<Category[]>(queryKeys.categories);
        const isToggleOnly =
          Object.keys(input).length === 1 && input.is_active !== undefined;
        if (isToggleOnly) {
          const next = client.setQueryData<Category[]>(queryKeys.categories, (old) =>
            old?.map((x) => (x.id === id ? { ...x, is_active: input.is_active! } : x)),
          );
          if (next) void saveCategoriesSnapshot(next);
        }
        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous !== undefined) {
          client.setQueryData(queryKeys.categories, context.previous);
          void saveCategoriesSnapshot(context.previous);
        }
      },
      onSuccess: categorySaved,
    }),
    deleteCategory: useMutation({
      mutationFn: (id: number) => api.deleteCategory(id),
      onMutate: () => cancel(queryKeys.categories),
      onSuccess: (_, id) => {
        const next = client.setQueryData<Category[]>(queryKeys.categories, (old) =>
          old?.filter((x) => x.id !== id),
        );
        if (next) void saveCategoriesSnapshot(next);
        stale(queryKeys.categories);
      },
    }),
    createMenuItem: useMutation({
      mutationFn: (x: MenuItemInput) => api.createMenuItem(x),
      onMutate: () => cancel(queryKeys.menu),
      onSuccess: menuSaved,
    }),
    updateMenuItem: useMutation({
      mutationFn: ({ id, input }: { id: number; input: Partial<MenuItemInput> }) =>
        api.updateMenuItem(id, input),
      onMutate: async ({ id, input }) => {
        await cancel(queryKeys.menu);
        const previous = client.getQueryData<MenuItem[]>(queryKeys.menu);
        const isToggleOnly =
          Object.keys(input).length === 1 && input.is_available !== undefined;
        if (isToggleOnly) {
          const next = client.setQueryData<MenuItem[]>(queryKeys.menu, (old) =>
            old?.map((x) =>
              x.id === id ? { ...x, is_available: input.is_available! } : x,
            ),
          );
          if (next) void saveMenuSnapshot(next);
        }
        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous !== undefined) {
          client.setQueryData(queryKeys.menu, context.previous);
          void saveMenuSnapshot(context.previous);
        }
      },
      onSuccess: menuSaved,
    }),
    deleteMenuItem: useMutation({
      mutationFn: (id: number) => api.deleteMenuItem(id),
      onMutate: () => cancel(queryKeys.menu),
      onSuccess: (_, id) => {
        const next = client.setQueryData<MenuItem[]>(queryKeys.menu, (old) =>
          old?.filter((x) => x.id !== id),
        );
        if (next) void saveMenuSnapshot(next);
        stale(queryKeys.menu);
      },
    }),
    uploadCategoryImage: useMutation({
      mutationFn: ({ id, file }: { id: number; file: File }) =>
        api.uploadCategoryImage(id, file),
      onMutate: () => cancel(queryKeys.categories),
      onSuccess: ({ image_path }, { id }) => {
        const next = client.setQueryData<Category[]>(queryKeys.categories, (old) =>
          old?.map((x) => (x.id === id ? { ...x, image_path } : x)),
        );
        if (next) void saveCategoriesSnapshot(next);
        stale(queryKeys.categories);
      },
    }),
    uploadMenuItemImage: useMutation({
      mutationFn: ({ id, file }: { id: number; file: File }) =>
        api.uploadMenuItemImage(id, file),
      onMutate: () => cancel(queryKeys.menu),
      onSuccess: ({ image_path }, { id }) => {
        const next = client.setQueryData<MenuItem[]>(queryKeys.menu, (old) =>
          old?.map((x) => (x.id === id ? { ...x, image_path } : x)),
        );
        if (next) void saveMenuSnapshot(next);
        stale(queryKeys.menu);
      },
    }),
  };
}

export function useCancelPaidBill() {
  const client = useQueryClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.cancelBill(id, reason),
    onSuccess: (updated) => {
      for (const [key, data] of client.getQueriesData<BillDetail[]>({
        queryKey: queryKeys.bills,
      })) {
        if (!Array.isArray(data)) continue;
        client.setQueryData<BillDetail[]>(
          key,
          data.map((b) => (b.id === updated.id ? updated : b)),
        );
      }
      refresh(
        queryKeys.bills,
        queryKeys.daily,
        queryKeys.reports,
        queryKeys.audits,
      );
    },
  });
}

export function useDeleteBill() {
  const client = useQueryClient();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: number) => api.deleteBill(id),
    onSuccess: (_void, id) => {
      for (const [key, data] of client.getQueriesData<BillDetail[]>({
        queryKey: queryKeys.bills,
      })) {
        if (!Array.isArray(data)) continue;
        client.setQueryData<BillDetail[]>(
          key,
          data.filter((b) => b.id !== id),
        );
      }
      refresh(
        queryKeys.bills,
        queryKeys.daily,
        queryKeys.reports,
        queryKeys.audits,
      );
    },
  });
}

export function useBilling() {
  const client = useQueryClient();
  const refresh = useRefresh();
  const cancelPaid = useCancelPaidBill();
  const deleteBill = useDeleteBill();
  const done = () => refresh(queryKeys.bills, queryKeys.reports, queryKeys.audits);
  const heldKey = [...queryKeys.bills, "held"] as const;

  return {
    capabilities: useQuery({
      queryKey: [...queryKeys.bills, "capabilities"],
      queryFn: () =>
        fetchWithReferenceFallback("billing_capabilities", () => api.getBillingCapabilities()),
      retry: false,
      staleTime: REFERENCE_STALE_TIME_MS,
      networkMode: "always",
    }),
    held: useQuery({ queryKey: heldKey, queryFn: () => api.getHeldBills() }),
    hold: useMutation({
      mutationFn: (x: BillInput) => api.holdBill(x),
      onMutate: async (input) => {
        await client.cancelQueries({ queryKey: heldKey });
        const previous = client.getQueryData<BillDetail[]>(heldKey);
        const existing =
          input.bill_id !== undefined
            ? previous?.find((b) => b.id === input.bill_id)
            : undefined;
        const optimistic = buildOptimisticHeldBill(
          input,
          existing,
          client.getQueryData<MenuItem[]>(queryKeys.menu),
        );
        client.setQueryData<BillDetail[]>(heldKey, (old) => [
          optimistic,
          ...(old ?? []).filter((b) => b.id !== optimistic.id),
        ]);
        return { previous, optimisticId: optimistic.id };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          client.setQueryData(heldKey, context.previous);
        }
      },
      onSuccess: (saved, _input, context) => {
        client.setQueryData<BillDetail[]>(heldKey, (old) =>
          old
            ? [
                saved,
                ...old.filter(
                  (b) => b.id !== saved.id && b.id !== context?.optimisticId,
                ),
              ]
            : [saved],
        );
        done();
      },
    }),
    checkout: useMutation({
      mutationFn: (x: CheckoutInput) => api.checkoutBill(x),
      onSuccess: (bill) => {
        reconcileSyncedBillInCache(
          client,
          bill,
          bill.clientBillId ?? bill.client_bill_id ?? String(bill.id),
        );
      },
    }),
    cancel: useMutation({
      mutationFn: ({ id, reason }: { id: number; reason: string }) =>
        api.cancelHeldBill(id, reason),
      onMutate: async ({ id }) => {
        await client.cancelQueries({ queryKey: heldKey });
        const previous = client.getQueryData<BillDetail[]>(heldKey);
        client.setQueryData<BillDetail[]>(heldKey, (old) =>
          old ? old.filter((b) => b.id !== id) : old,
        );
        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous !== undefined) {
          client.setQueryData(heldKey, context.previous);
        }
      },
      onSuccess: done,
    }),
    cancelPaid,
    deleteBill,
    reprint: useMutation({
      mutationFn: (id: number) => api.logBillReprint(id),
      onSuccess: done,
    }),
  };
}

export function useInventory() {
  const client = useQueryClient();
  const refresh = useRefresh();
  const done = () =>
    refresh(
      queryKeys.inventory,
      queryKeys.purchases,
      queryKeys.daily,
      queryKeys.movements,
      queryKeys.notifications,
      queryKeys.reports,
      queryKeys.audits,
    );

  return {
    items: useQuery({ queryKey: queryKeys.inventory, queryFn: () => api.getInventoryItems() }),
    purchases: useQuery({ queryKey: queryKeys.purchases, queryFn: () => api.getPurchases() }),
    dailyEntries: useQuery({ queryKey: queryKeys.daily, queryFn: () => api.getDailyEntries() }),
    movements: useQuery({ queryKey: queryKeys.movements, queryFn: () => api.getStockMovements() }),
    createItem: useMutation({
      mutationFn: (x: InventoryInput) => api.createInventoryItem(x),
      onSuccess: (created) => {
        client.setQueryData<InventoryItem[]>(queryKeys.inventory, (old) =>
          old ? [...old.filter((x) => x.id !== created.id), created] : [created],
        );
        done();
      },
    }),
    updateItem: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: number;
        input: Partial<Omit<InventoryInput, "current_qty" | "avg_unit_cost">>;
      }) => api.updateInventoryItem(id, input),
      onSuccess: (updated) => {
        client.setQueryData<InventoryItem[]>(queryKeys.inventory, (old) =>
          old?.map((x) => (x.id === updated.id ? updated : x)),
        );
        done();
      },
    }),
    purchase: useMutation({
      mutationFn: (x: PurchaseInput) => api.createPurchase(x),
      onSuccess: done,
    }),
    dailyEntry: useMutation({
      mutationFn: (x: DailyEntryInput) => api.createDailyEntry(x),
      onMutate: async (input) => {
        await client.cancelQueries({ queryKey: queryKeys.inventory });
        await client.cancelQueries({ queryKey: queryKeys.daily });
        const previousItems = client.getQueryData<InventoryItem[]>(queryKeys.inventory);
        const previousDaily = client.getQueryData<StockDailyEntry[]>(queryKeys.daily);
        const totalOut = input.used_qty + input.wasted_qty;
        client.setQueryData<InventoryItem[]>(queryKeys.inventory, (old) =>
          old?.map((item) =>
            item.id === input.inventory_item_id
              ? { ...item, current_qty: roundStock(item.current_qty - totalOut) }
              : item,
          ),
        );
        const optimisticId = -Date.now();
        const optimisticEntry: StockDailyEntry = {
          id: optimisticId,
          request_key: input.request_key ?? null,
          business_date: input.business_date,
          inventory_item_id: input.inventory_item_id,
          used_qty: input.used_qty,
          wasted_qty: input.wasted_qty,
          notes: input.notes ?? null,
          created_by: 0,
          posted_at: new Date().toISOString(),
        };
        client.setQueryData<StockDailyEntry[]>(queryKeys.daily, (old) =>
          old ? [optimisticEntry, ...old] : old,
        );
        return { previousItems, previousDaily, optimisticId };
      },
      onError: (_error, _input, context) => {
        if (context?.previousItems !== undefined) {
          client.setQueryData(queryKeys.inventory, context.previousItems);
        }
        if (context?.previousDaily !== undefined) {
          client.setQueryData(queryKeys.daily, context.previousDaily);
        }
      },
      onSuccess: (created, _input, context) => {
        client.setQueryData<StockDailyEntry[]>(queryKeys.daily, (old) =>
          old
            ? [
                created,
                ...old.filter(
                  (entry) =>
                    entry.id !== created.id && entry.id !== context?.optimisticId,
                ),
              ]
            : old,
        );
        done();
      },
    }),
    adjust: useMutation({
      mutationFn: (x: AdjustmentInput) => api.createStockAdjustment(x),
      onSuccess: (movement) => {
        client.setQueryData<InventoryItem[]>(queryKeys.inventory, (old) =>
          old?.map((item) =>
            item.id === movement.inventory_item_id
              ? { ...item, current_qty: movement.balance_after }
              : item,
          ),
        );
        client.setQueryData<StockMovement[]>(queryKeys.movements, (old) =>
          old ? [movement, ...old.filter((m) => m.id !== movement.id)] : old,
        );
        done();
      },
    }),
  };
}

export function useReports(range: ReportDateRange) {
  const client = useQueryClient();
  const refresh = useRefresh();
  return {
    summary: useQuery({
      queryKey: [...queryKeys.reports, "summary", range],
      queryFn: () => api.getFinancialSummary(range),
    }),
    ledger: useQuery({
      queryKey: [...queryKeys.reports, "ledger", range],
      queryFn: () => api.getSalesLedger(range),
    }),
    items: useQuery({
      queryKey: [...queryKeys.reports, "items", range],
      queryFn: () => api.getMenuItemSales(range),
    }),
    inventory: useQuery({
      queryKey: [...queryKeys.reports, "inventory", range],
      queryFn: () => api.getInventorySummary(range),
    }),
    waste: useQuery({
      queryKey: [...queryKeys.reports, "waste", range],
      queryFn: () => api.getWasteAnalysis(range),
    }),
    expenses: useQuery({
      queryKey: [...queryKeys.expenses, range],
      queryFn: () => api.getOperatingExpenses(range),
    }),
    createExpense: useMutation({
      mutationFn: (x: ExpenseInput) => api.createOperatingExpense(x),
      onMutate: async (input) => {
        await client.cancelQueries({ queryKey: queryKeys.expenses });
        await client.cancelQueries({ queryKey: [...queryKeys.reports, "summary"] });
        const previousExpenses = client.getQueriesData<OperatingExpense[]>({
          queryKey: queryKeys.expenses,
        });
        const previousSummaries = client.getQueriesData<
          FinancialSummaryReport & { trend: SalesTrendPoint[] }
        >({
          queryKey: [...queryKeys.reports, "summary"],
        });
        const optimisticId = -Date.now();
        const optimisticExpense: OperatingExpense = {
          id: optimisticId,
          business_date: input.business_date,
          expense_category: input.expense_category,
          description: input.description,
          amount: input.amount,
          created_by: 0,
          created_at: new Date().toISOString(),
        };

        for (const [key, data] of previousExpenses) {
          if (!data) continue;
          const keyRange = key[1] as ReportDateRange | undefined;
          if (!dateInRange(input.business_date, keyRange)) continue;
          client.setQueryData<OperatingExpense[]>(key, [optimisticExpense, ...data]);
        }

        for (const [key, data] of previousSummaries) {
          if (!data) continue;
          const keyRange = key[2] as ReportDateRange | undefined;
          if (!dateInRange(input.business_date, keyRange)) continue;
          client.setQueryData(key, {
            ...data,
            operating_expense: roundMoney(data.operating_expense + input.amount),
            estimated_operating_profit: roundMoney(
              data.estimated_operating_profit - input.amount,
            ),
          });
        }

        return { previousExpenses, previousSummaries, optimisticId };
      },
      onError: (_error, _input, context) => {
        if (!context) return;
        for (const [key, data] of context.previousExpenses) {
          client.setQueryData(key, data);
        }
        for (const [key, data] of context.previousSummaries) {
          client.setQueryData(key, data);
        }
      },
      onSuccess: (created, _input, context) => {
        for (const [key, data] of client.getQueriesData<OperatingExpense[]>({
          queryKey: queryKeys.expenses,
        })) {
          if (!data) continue;
          const keyRange = key[1] as ReportDateRange | undefined;
          if (!dateInRange(created.business_date, keyRange)) continue;
          client.setQueryData<OperatingExpense[]>(key, [
            created,
            ...data.filter(
              (item) => item.id !== created.id && item.id !== context?.optimisticId,
            ),
          ]);
        }
        refresh(queryKeys.reports, queryKeys.expenses, queryKeys.audits);
      },
    }),
  };
}

export function useAdmin(enabled = true, auditEnabled = enabled) {
  const refresh = useRefresh();
  const client = useQueryClient();
  return {
    users: useQuery({ queryKey: queryKeys.users, queryFn: () => api.getUsers(), enabled }),
    audits: useQuery({
      queryKey: queryKeys.audits,
      queryFn: () => api.getAuditLogs(),
      enabled: auditEnabled,
    }),
    updateStore: useMutation({
      mutationFn: (
        x: Partial<Pick<StoreSettings, "store_name" | "address" | "phone" | "receipt_footer">>,
      ) => api.updateStoreSettings(x),
      onSuccess: (updated) => {
        client.setQueryData<StoreSettings>(queryKeys.store, updated);
        void saveStoreSettingsSnapshot(updated);
        clearPublicMenuCache(dataMode, browserStorage());
        void client.invalidateQueries({ queryKey: ["public-menu"] });
        refresh(queryKeys.store, queryKeys.audits);
      },
    }),
    updateUser: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: number;
        input: Partial<Pick<User, "username" | "full_name" | "is_active">>;
      }) => api.updateUser(id, input),
      onSuccess: (updated) => {
        client.setQueryData<User[]>(queryKeys.users, (old) =>
          old?.map((u) => (u.id === updated.id ? updated : u)),
        );
        refresh(queryKeys.users, queryKeys.audits);
      },
    }),
    resetPassword: useMutation({
      mutationFn: ({ id, password }: { id: number; password: string }) =>
        api.resetUserPassword(id, password),
      onSuccess: () => refresh(queryKeys.users, queryKeys.audits),
    }),
  };
}

export function useNotifications(enabled = true) {
  const client = useQueryClient();
  const refresh = useRefresh();
  return {
    notifications: useQuery({
      queryKey: queryKeys.notifications,
      queryFn: () => api.getNotifications(),
      enabled,
    }),
    markRead: useMutation({
      mutationFn: (id: number) => api.markNotificationRead(id),
      onMutate: async (id) => {
        await client.cancelQueries({ queryKey: queryKeys.notifications });
        const previous = client.getQueryData<Notification[]>(queryKeys.notifications);
        const now = new Date().toISOString();
        client.setQueryData<Notification[]>(queryKeys.notifications, (old) =>
          old?.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? now } : n)),
        );
        return { previous };
      },
      onError: (_error, _id, context) => {
        if (context?.previous !== undefined) {
          client.setQueryData(queryKeys.notifications, context.previous);
        }
      },
      onSuccess: (updated) => {
        client.setQueryData<Notification[]>(queryKeys.notifications, (old) =>
          old?.map((n) => (n.id === updated.id ? updated : n)),
        );
        refresh(queryKeys.notifications);
      },
    }),
  };
}

export type BillFilters = {
  from: string;
  to: string;
  search: string;
  paymentMethod: "ALL" | "CASH" | "UPI" | "CARD";
};

export function useBills(filters: BillFilters, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.bills, "history", filters],
    enabled,
    queryFn: async () => {
      const bills = await api.listBills({
        from: filters.from || null,
        to: filters.to || null,
      });
      const search = filters.search.trim().toLowerCase();
      return bills
        .filter(
          (b) =>
            (b.status === "PAID" || b.status === "CANCELLED") &&
            (!search || b.bill_number?.toLowerCase().includes(search)) &&
            (filters.paymentMethod === "ALL" ||
              b.payment?.payment_method === filters.paymentMethod),
        )
        .sort((a, b) =>
          (b.paid_at ?? b.cancelled_at ?? b.created_at).localeCompare(
            a.paid_at ?? a.cancelled_at ?? a.created_at,
          ),
        );
    },
  });
}

function matchesSyncedBill(
  candidate: BillDetail,
  syncedBill: BillDetail,
  clientBillId: string,
): boolean {
  const candidateClientId = candidate.clientBillId ?? candidate.client_bill_id;
  if (candidateClientId && candidateClientId === clientBillId) return true;
  if (syncedBill.bill_number && candidate.bill_number === syncedBill.bill_number)
    return true;
  return candidate.id === syncedBill.id;
}

function matchesHistoryFilters(
  bill: BillDetail,
  filters: BillFilters | undefined,
): boolean {
  if (!filters) return true;
  if (filters.from && bill.business_date < filters.from) return false;
  if (filters.to && bill.business_date > filters.to) return false;
  if (
    filters.paymentMethod !== "ALL" &&
    bill.payment?.payment_method !== filters.paymentMethod
  )
    return false;
  const search = filters.search.trim().toLowerCase();
  if (search && !bill.bill_number?.toLowerCase().includes(search)) return false;
  return true;
}

export function reconcileSyncedBillInCache(
  client: QueryClient,
  syncedBill: BillDetail,
  clientBillId: string,
): void {
  const normalized: BillDetail = {
    ...syncedBill,
    clientBillId: syncedBill.clientBillId ?? clientBillId,
    syncStatus: "SYNCED",
    syncError: null,
  };

  client.setQueryData<BillDetail[]>([...queryKeys.bills, "held"], (old) =>
    old ? old.filter((b) => b.id !== normalized.id) : old,
  );

  for (const [key, data] of client.getQueriesData<BillDetail[]>({
    queryKey: [...queryKeys.bills, "history"],
  })) {
    if (!data) continue;
    const filters = key[2] as BillFilters | undefined;
    const deduplicated = data.filter((b) => !matchesSyncedBill(b, normalized, clientBillId));
    const next = matchesHistoryFilters(normalized, filters)
      ? [normalized, ...deduplicated].sort((a, b) =>
          (b.paid_at ?? b.cancelled_at ?? b.created_at).localeCompare(
            a.paid_at ?? a.cancelled_at ?? a.created_at,
          ),
        )
      : deduplicated;
    client.setQueryData(key, next);
  }

  for (const [key, data] of client.getQueriesData<BillDetail[]>({
    queryKey: [...queryKeys.bills, "report"],
  })) {
    if (!data) continue;
    const range = key[2] as ReportDateRange | undefined;
    const inRange =
      !range ||
      ((!range.from || normalized.business_date >= range.from) &&
        (!range.to || normalized.business_date <= range.to));
    const deduplicated = data.filter((b) => !matchesSyncedBill(b, normalized, clientBillId));
    client.setQueryData(key, inRange ? [normalized, ...deduplicated] : deduplicated);
  }

  void client.invalidateQueries({ queryKey: queryKeys.bills });
  void client.invalidateQueries({ queryKey: queryKeys.reports });
  void client.invalidateQueries({ queryKey: queryKeys.audits });
}
