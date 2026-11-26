import type * as D from "@/types/domain";
export type CategoryInput = Omit<D.Category, "id" | "created_at" | "updated_at">;
export type MenuItemInput = Omit<D.MenuItem, "id" | "created_at" | "updated_at">;
export type InventoryInput = Omit<D.InventoryItem, "id" | "created_at" | "updated_at">;
export type BillLineInput = { menu_item_id: number; portion?: D.PortionSize; quantity: number; line_discount_amount?: number; expected_unit_price?: number };
export type BillInput = { items: BillLineInput[]; hold_label?: string | null; note?: string | null; bill_id?: number };
export type CheckoutInput = BillInput & {
  checkout_key: string;
  payment_method: D.PaymentMethod;
  tendered_amount: number;
  reference_number?: string | null;
  round_off?: boolean;
  clientBillId?: string;
  clientBillNumber?: string;
  clientCreatedAt?: string;
};
export type PurchaseInput = { business_date: string; purchase_reference?: string | null; supplier_name?: string | null; notes?: string | null; lines: { inventory_item_id: number; quantity: number; unit_cost: number }[] };
export type DailyEntryInput = { business_date: string; inventory_item_id: number; used_qty: number; wasted_qty: number; notes?: string | null; request_key?: string | null };
export type AdjustmentInput = { business_date: string; inventory_item_id: number; movement_type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"; quantity: number; notes: string };
export type ExpenseInput = Pick<D.OperatingExpense, "business_date" | "expense_category" | "description" | "amount">;
export interface PosApiClient {
 getPublicMenu(): Promise<D.PublicMenu>;
 login(username: string, password: string): Promise<D.User>; logout(): Promise<void>; getMe(): Promise<D.User | null>;
 getCategories(): Promise<D.Category[]>; createCategory(input: CategoryInput): Promise<D.Category>; updateCategory(id: number, input: Partial<CategoryInput>): Promise<D.Category>; deleteCategory(id: number): Promise<void>; uploadCategoryImage(id: number, file: File): Promise<{ image_path: string }>;
 getMenuItems(params?: { categoryId?: number; search?: string }): Promise<D.MenuItem[]>; getMenuItemById(id: number): Promise<D.MenuItem>; getMenuItemsByCategory(categoryId: number): Promise<D.MenuItem[]>; searchMenuItems(query: string): Promise<D.MenuItem[]>; createMenuItem(input: MenuItemInput): Promise<D.MenuItem>; updateMenuItem(id: number, input: Partial<MenuItemInput>): Promise<D.MenuItem>; deleteMenuItem(id: number): Promise<void>; uploadMenuItemImage(id: number, file: File): Promise<{ image_path: string }>;
 getBillingCapabilities(): Promise<{ round_off: boolean }>; holdBill(input: BillInput): Promise<D.BillDetail>; getHeldBills(): Promise<D.BillDetail[]>; getBillById(id: number): Promise<D.BillDetail>; listBills(range?: D.ReportDateRange): Promise<D.BillDetail[]>; cancelHeldBill(id: number, reason: string): Promise<D.BillDetail>; checkoutBill(input: CheckoutInput): Promise<D.BillDetail>; logBillReprint(id: number): Promise<void>;
 getInventoryItems(): Promise<D.InventoryItem[]>; createInventoryItem(input: InventoryInput): Promise<D.InventoryItem>; updateInventoryItem(id: number, input: Partial<Omit<InventoryInput, "current_qty" | "avg_unit_cost">>): Promise<D.InventoryItem>;
 getPurchases(): Promise<(D.StockPurchase & { lines: D.StockPurchaseLine[] })[]>; createPurchase(input: PurchaseInput): Promise<D.StockPurchase>; getDailyEntries(): Promise<D.StockDailyEntry[]>; createDailyEntry(input: DailyEntryInput): Promise<D.StockDailyEntry>; getStockMovements(): Promise<D.StockMovement[]>; createStockAdjustment(input: AdjustmentInput): Promise<D.StockMovement>;
 getFinancialSummary(range: D.ReportDateRange): Promise<D.FinancialSummaryReport & { trend: D.SalesTrendPoint[] }>; getSalesLedger(range: D.ReportDateRange): Promise<D.SalesLedgerRow[]>; getMenuItemSales(range: D.ReportDateRange): Promise<D.MenuItemSalesRow[]>; getInventorySummary(range: D.ReportDateRange): Promise<D.InventorySummaryRow[]>; getWasteAnalysis(range: D.ReportDateRange): Promise<D.WasteAnalysisRow[]>; getOperatingExpenses(range: D.ReportDateRange): Promise<D.OperatingExpense[]>; createOperatingExpense(input: ExpenseInput): Promise<D.OperatingExpense>;
 getStoreSettings(): Promise<D.StoreSettings>; updateStoreSettings(input: Partial<Pick<D.StoreSettings,"store_name" | "address" | "phone" | "receipt_footer">>): Promise<D.StoreSettings>; getUsers(): Promise<D.User[]>; updateUser(id: number, input: Partial<Pick<D.User,"username" | "full_name" | "is_active">>): Promise<D.User>; resetUserPassword(id: number, password: string): Promise<void>; getNotifications(): Promise<D.Notification[]>; markNotificationRead(id: number): Promise<D.Notification>; getAuditLogs(): Promise<D.AuditLog[]>;
}
