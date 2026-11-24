import assert from "node:assert/strict";
import { roundBillTotal } from "../src/lib/roundOff";
import { MockPosApiClient, resetDemoData } from "../src/services/mock/mockPosApiClient";
import { buildBillingReport } from "../src/components/reports/billingReportData";
import { buildBillingWorkbook } from "../src/lib/exports/billingReportExcel";

for (const [amount, total, adjustment] of [[100.00, 100, 0], [100.01, 100, -0.01], [100.49, 100, -0.49], [100.50, 101, 0.50], [100.99, 101, 0.01]] as const) {
  assert.deepEqual(roundBillTotal(amount), { total, adjustment });
}
const data = new Map<string, string>();
Object.assign(globalThis, { window: {}, localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) } });
async function main() {
  resetDemoData();
  const api = new MockPosApiClient();
  await api.login("admin", "demo");
  for (const [price, method, rounded, expected, adjustment] of [[100.49, "CASH", true, 100, -0.49], [100.50, "UPI", true, 101, 0.50], [100.01, "CARD", true, 100, -0.01], [100.49, "UPI", false, 100.49, 0]] as const) {
    await api.updateMenuItem(1, { selling_price: price });
    const input = { checkout_key: `round-off-${price}-${method}`, items: [{ menu_item_id: 1, quantity: 1, expected_unit_price: price }], payment_method: method, tendered_amount: expected, round_off: rounded };
    const bill = await api.checkoutBill(input);
    assert.equal(bill.round_off_amount, adjustment);
    assert.equal(bill.total_amount, expected);
    assert.equal(bill.payment?.amount, expected);
    assert.equal(bill.items[0].line_net_total, price);
    assert.equal((await api.getBillById(bill.id)).round_off_amount, adjustment);
    assert.equal((await api.checkoutBill(input)).id, bill.id);
    if (adjustment) await assert.rejects(() => api.checkoutBill({ ...input, round_off: !rounded }), { status: 409 });
    const report = buildBillingReport([bill]);
    assert.equal(Math.round((report.itemRevenue + report.roundOff) * 100), Math.round(report.revenue * 100));
    const workbook = buildBillingWorkbook(report, "LIFETIME", { from: null, to: null });
    assert.equal(workbook.Sheets["Paid bills"].H2.v, adjustment);
    assert.equal(workbook.Sheets["Paid bills"].I2.v, expected);
  }
  console.log("Round-off calculation, checkout, persistence and reports passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
