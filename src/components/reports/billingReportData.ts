import type { BillDetail, PaymentMethod, ReportPeriod } from "@/types/domain";

const cents = (amount: number) => Math.round(amount * 100);

export function buildBillingReport(bills: BillDetail[]) {
  const paid = bills.filter((bill) => bill.status === "PAID").sort((a, b) =>
    (b.paid_at ?? b.created_at).localeCompare(a.paid_at ?? a.created_at),
  );
  const payments = new Map<PaymentMethod | "UNKNOWN", { count: number; total: number }>();
  const sellers = new Map<number, { menuItemId: number; name: string; quantity: number; revenue: number }>();
  let revenue = 0, discounts = 0, roundOff = 0, itemRevenue = 0, items = 0;
  for (const bill of paid) {
    revenue += cents(bill.total_amount);
    discounts += cents(bill.discount_amount);
    roundOff += cents(bill.round_off_amount ?? 0);
    items += bill.item_count;
    const method = bill.payment?.payment_method ?? "UNKNOWN";
    const payment = payments.get(method) ?? { count: 0, total: 0 };
    payment.count++;
    payment.total += cents(bill.total_amount);
    payments.set(method, payment);
    for (const line of bill.items) {
      const seller = sellers.get(line.menu_item_id) ?? { menuItemId: line.menu_item_id, name: line.item_name_snapshot, quantity: 0, revenue: 0 };
      seller.quantity += line.quantity;
      seller.revenue += cents(line.line_net_total);
      itemRevenue += cents(line.line_net_total);
      sellers.set(line.menu_item_id, seller);
    }
  }
  return {
    paid, revenue: revenue / 100, discounts: discounts / 100, roundOff: roundOff / 100, itemRevenue: itemRevenue / 100, items,
    average: paid.length ? revenue / paid.length / 100 : 0,
    payments: (["CASH", "UPI", "CARD", "UNKNOWN"] as const).map((method) => ({ method, count: payments.get(method)?.count ?? 0, total: (payments.get(method)?.total ?? 0) / 100 })),
    sellers: [...sellers.values()].map((seller) => ({ ...seller, revenue: seller.revenue / 100 })).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name)),
  };
}

export type BillingReport = ReturnType<typeof buildBillingReport>;

export function billingSalesTrend(paid: BillDetail[], period: ReportPeriod) {
  const months = period === "QUARTERLY" || period === "YEARLY" || period === "LIFETIME";
  const totals = new Map<string, number>();
  for (const bill of paid) {
    const date = months ? bill.business_date.slice(0, 7) : bill.business_date;
    totals.set(date, (totals.get(date) ?? 0) + cents(bill.total_amount));
  }
  return [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, sales: total / 100 }));
}
