import assert from "node:assert/strict";
import { billingSalesTrend, buildBillingReport } from "../src/components/reports/billingReportData";
import { buildBillingWorkbook } from "../src/lib/exports/billingReportExcel";
import type { BillDetail } from "../src/types/domain";

const makeBill = (id: number, status: BillDetail["status"], total: number, method: "CASH" | "UPI"): BillDetail => ({
  id, status, bill_number: `B${id}`, checkout_key: null, business_date: "2026-11-22", hold_label: null,
  item_count: 2, subtotal_amount: total + 1, discount_amount: 1, total_amount: total, note: null,
  store_name_snapshot: null, store_address_snapshot: null, store_phone_snapshot: null, created_by: 1,
  paid_by: 1, cancelled_by: null, cancel_reason: null, created_at: "2026-11-22T00:00:00Z",
  held_at: null, paid_at: "2026-11-22T01:00:00Z", cancelled_at: null, updated_at: "2026-11-22T01:00:00Z",
  items: [{ id, bill_id: id, menu_item_id: 3, item_name_snapshot: "Dosa", quantity: 2, unit_price: (total + 1) / 2,
    estimated_unit_cost_snapshot: null, line_discount_amount: 1, line_total: total + 1, line_net_total: total, created_at: "2026-11-22T00:00:00Z" }],
  payment: { id, bill_id: id, payment_method: method, amount: total, tendered_amount: total,
    change_amount: 0, reference_number: null, recorded_by: 1, recorded_at: "2026-11-22T01:00:00Z" },
});
const report = buildBillingReport([makeBill(1, "PAID", 99.99, "CASH"), makeBill(2, "PAID", 100.02, "UPI"), makeBill(3, "HELD", 50, "CASH"), makeBill(4, "CANCELLED", 30, "CASH")]);
assert.equal(report.revenue, 200.01);
assert.equal(report.discounts, 2);
assert.equal(report.items, 4);
assert.equal(report.paid.length, 2);
assert.equal(report.payments.find((p) => p.method === "CASH")?.total, 99.99);
assert.equal(report.payments.find((p) => p.method === "UPI")?.total, 100.02);
assert.deepEqual(report.sellers, [{ menuItemId: 3, name: "Dosa", quantity: 4, revenue: 200.01 }]);
assert.deepEqual(billingSalesTrend(report.paid, "DAILY"), [{ date: "2026-11-22", sales: 200.01 }]);
const workbook = buildBillingWorkbook(report, "DAILY", { from: "2026-11-22", to: "2026-11-22" });
assert.deepEqual(workbook.SheetNames, ["Summary", "Paid bills", "Top selling items", "Payments", "Sales trend"]);
assert.equal(workbook.Sheets.Summary.B7.v, 200.01);
assert.equal(workbook.Sheets["Paid bills"].H2.t, "n");
assert.equal(workbook.Sheets["Top selling items"].C2.v, 200.01);
assert.equal(workbook.Sheets["Top selling items"].D2.v, 1);
assert.equal(buildBillingReport([]).average, 0);
console.log("Billing report reconciliation passed");
