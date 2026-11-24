import * as XLSX from "xlsx";
import type { BillingReport } from "@/components/reports/billingReportData";
import { billingSalesTrend } from "@/components/reports/billingReportData";
import type { ReportDateRange, ReportPeriod } from "@/types/domain";

export function buildBillingWorkbook(data: BillingReport, period: ReportPeriod, range: ReportDateRange) {
  const book = XLSX.utils.book_new();
  const sheets: [string, (string | number | null)[][], number[]][] = [
    ["Summary", [["Billing report"], ["Period", period], ["From", range.from ?? "All dates"], ["To", range.to ?? "All dates"], [], ["Metric", "Value"], ["Sales revenue (INR)", data.revenue], ["Paid bills", data.paid.length], ["Items sold", data.items], ["Discounts (INR)", data.discounts], ["Average bill (INR)", data.average], ["Round off adjustment (INR)", data.roundOff]], [1]],
    ["Paid bills", [["Bill number", "Business date", "Cashier", "Items", "Payment method", "Subtotal (INR)", "Discount (INR)", "Round off (INR)", "Total (INR)"], ...data.paid.map(b => [b.bill_number ?? `Bill #${b.id}`, b.business_date, b.cashier_name ?? "", b.item_count, b.payment?.payment_method ?? "Unspecified", b.subtotal_amount, b.discount_amount, b.round_off_amount ?? 0, b.total_amount])], [5, 6, 7, 8]],
    ["Top selling items", [["Dish", "Quantity sold", "Revenue before round off (INR)", "Share of item revenue"], ...data.sellers.map(s => [s.name, s.quantity, s.revenue, data.itemRevenue > 0 ? s.revenue / data.itemRevenue : null])], [2]],
    ["Payments", [["Payment method", "Paid bills", "Total (INR)"], ...data.payments.filter(p => p.method !== "UNKNOWN" || p.count > 0).map(p => [p.method === "UNKNOWN" ? "Unspecified" : p.method, p.count, p.total])], [2]],
    ["Sales trend", [[period === "QUARTERLY" || period === "YEARLY" || period === "LIFETIME" ? "Business month" : "Business date", "Sales revenue (INR)"], ...billingSalesTrend(data.paid, period).map(point => [point.date, point.sales])], [1]],
  ];
  for (const [name, rows, moneyColumns] of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const bounds = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
    for (let row = 1; row <= bounds.e.r; row++) for (const col of moneyColumns) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.t === "n" && (name !== "Summary" || [6, 9, 10, 11].includes(row))) cell.z = '"INR "#,##0.00';
    }
    if (name === "Top selling items") for (let row = 1; row <= bounds.e.r; row++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 3 })];
      if (cell?.t === "n") cell.z = "0.0%";
    }
    sheet["!cols"] = Array.from({ length: bounds.e.c + 1 }, (_, i) => ({ wch: i === 0 ? 32 : 20 }));
    XLSX.utils.book_append_sheet(book, sheet, name);
  }
  return book;
}

export function downloadBillingWorkbook(data: BillingReport, period: ReportPeriod, range: ReportDateRange) {
  XLSX.writeFile(buildBillingWorkbook(data, period, range), `sambar-spicy-billing-${range.from ?? "all"}-to-${range.to ?? "all"}.xlsx`);
}
