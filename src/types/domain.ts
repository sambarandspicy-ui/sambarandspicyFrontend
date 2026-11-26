export type DietaryType = "UNSPECIFIED" | "VEG" | "NON_VEG" | "EGG";
export interface PublicMenu {
  store: { name: string; address: string; phone: string };
  categories: { id: number; name: string; imagePath?: string | null }[];
  items: { id: number; categoryId: number; name: string; description?: string | null; dietaryType: DietaryType; sellingPrice: number; hasHalfPortion: boolean; halfSellingPrice?: number | null; imagePath?: string | null }[];
}
export type PortionSize = "FULL" | "HALF";
export type UserRole = "ADMIN" | "BILLING" | "READ_ONLY";
export type BillStatus = "HELD" | "PAID" | "CANCELLED";
export type BillSyncStatus = "SYNCED" | "PENDING" | "SYNCING" | "FAILED";
export type PaymentMethod = "CASH" | "UPI" | "CARD";
export type InventoryUnit = "PACK" | "KG" | "LITRE" | "PIECE";
export type StockMovementType = "PURCHASE" | "DAILY_USE" | "WASTE" | "OPENING" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
export type AlertSeverity = "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "RESOLVED";
export type ReportPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "LIFETIME";
export interface User { id: 1 | 2 | 3; role: UserRole; username: string; full_name: string; is_active: boolean; last_login_at: string | null; created_at: string; updated_at: string }
export interface AuthRefreshToken { id: number; user_id: number; token_hash: string; expires_at: string; revoked_at: string | null; created_at: string }
export interface StoreSettings { id: 1; store_name: string; address: string; phone: string; currency_code: string; business_timezone: string; receipt_footer: string | null; updated_by: number | null; updated_at: string }
export interface Category { id: number; name: string; image_path: string | null; sort_order: number; is_active: boolean; created_at: string; updated_at: string }
export interface MenuItem { id: number; category_id: number; sku: string | null; name: string; description: string | null; dietary_type: DietaryType; selling_price: number; has_half_portion?: boolean; half_selling_price?: number | null; estimated_unit_cost: number | null; half_estimated_unit_cost?: number | null; image_path: string | null; sort_order: number; is_available: boolean; created_at: string; updated_at: string }
export interface BillCounter { business_date: string; last_sequence: number; updated_at: string }
export interface Bill { id: number; bill_number: string | null; checkout_key: string | null; client_bill_id?: string | null; clientBillId?: string; syncStatus?: BillSyncStatus; syncError?: string | null; business_date: string; status: BillStatus; hold_label: string | null; item_count: number; subtotal_amount: number; discount_amount: number; round_off_amount?: number; total_amount: number; note: string | null; store_name_snapshot: string | null; store_address_snapshot: string | null; store_phone_snapshot: string | null; created_by: number; paid_by: number | null; cancelled_by: number | null; cancel_reason: string | null; created_at: string; held_at: string | null; paid_at: string | null; cancelled_at: string | null; updated_at: string }
export interface BillItem { id: number; bill_id: number; menu_item_id: number; portion?: PortionSize; item_name_snapshot: string; quantity: number; unit_price: number; estimated_unit_cost_snapshot: number | null; line_discount_amount: number; line_total: number; line_net_total: number; created_at: string }
export interface BillPayment { id: number; bill_id: number; payment_method: PaymentMethod; amount: number; tendered_amount: number; change_amount: number; reference_number: string | null; recorded_by: number; recorded_at: string }
export interface BillDetail extends Bill { items: BillItem[]; payment: BillPayment | null; cashier_name?: string | null }
export interface InventoryItem { id: number; name: string; sku: string | null; unit: InventoryUnit; current_qty: number; min_limit_qty: number; critical_limit_qty: number; avg_unit_cost: number; is_active: boolean; created_at: string; updated_at: string }
export interface StockPurchase { id: number; purchase_reference: string | null; supplier_name: string | null; business_date: string; total_amount: number; notes: string | null; created_by: number; created_at: string }
export interface StockPurchaseLine { id: number; purchase_id: number; inventory_item_id: number; quantity: number; unit_cost: number; line_total: number }
export interface StockDailyEntry { id: number; request_key: string | null; business_date: string; inventory_item_id: number; used_qty: number; wasted_qty: number; notes: string | null; created_by: number; posted_at: string }
export interface StockMovement { id: number; inventory_item_id: number; business_date: string; movement_type: StockMovementType; quantity_delta: number; cost_per_unit_snapshot: number; cost_amount: number; balance_after: number; purchase_line_id: number | null; daily_entry_id: number | null; notes: string | null; recorded_by: number; recorded_at: string }
export interface OperatingExpense { id: number; business_date: string; expense_category: string; description: string; amount: number; created_by: number; created_at: string }
export interface Notification { id: number; inventory_item_id: number; severity: AlertSeverity; status: AlertStatus; message: string; triggered_qty: number; created_at: string; last_notified_at: string; read_by: number | null; read_at: string | null; resolved_at: string | null; open_inventory_item_id: number | null }
export interface AuditLog { id: number; actor_user_id: number | null; action: string; entity_type: string; entity_id: string | null; old_data: unknown; new_data: unknown; ip_address: string | null; created_at: string }
export interface ReportDateRange { from: string | null; to: string | null }
export interface FinancialSummaryReport { sales_revenue: number; stock_used_cost: number; waste_cost: number; stock_adjustment_loss: number; operating_expense: number; contribution_after_stock_cost: number; estimated_operating_profit: number; waste_ratio_percent: number | null; estimated_operating_margin_percent: number | null; purchase_cash_outflow: number }
export interface SalesTrendPoint extends FinancialSummaryReport { business_date: string }
export interface MenuItemSalesRow { business_date: string; menu_item_id: number; item_name: string; quantity_sold: number; sales_revenue: number; quantity_missing_cost: number; estimated_item_cost: number | null; estimated_item_profit: number | null }
export interface InventorySummaryRow { inventory_item_id: number; name: string; unit: InventoryUnit; opening_qty: number; opening_value: number; purchase_qty: number; purchase_value: number; used_qty: number; waste_qty: number; adjustment_qty: number; closing_qty: number; closing_value: number }
export interface WasteAnalysisRow { inventory_item_id: number; name: string; unit: InventoryUnit; used_qty: number; used_cost: number; waste_qty: number; waste_cost: number; waste_ratio_percent: number | null }
export interface SalesLedgerRow { bill: Bill; items: BillItem[]; payment: BillPayment | null; cashier: string }
