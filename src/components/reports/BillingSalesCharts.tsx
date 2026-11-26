"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import type { ReportPeriod } from "@/types/domain";
import { billingSalesTrend, type BillingReport } from "./billingReportData";

const colors: Record<string, string> = {
  CASH: "#17552f",
  UPI: "#227643",
  CARD: "#b58a27",
  UNKNOWN: "#dc2626",
};
const names: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  UNKNOWN: "Unspecified",
};

export function BillingSalesCharts({
  data,
  period,
}: {
  data: BillingReport;
  period: ReportPeriod;
}) {
  const trend = billingSalesTrend(data.paid, period);
  const payments = data.payments.filter((p) => p.total > 0);

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
        <h2 className="font-bold">Sales trend</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid bill revenue by business{" "}
          {period === "QUARTERLY" || period === "YEARLY" || period === "LIFETIME"
            ? "month"
            : "date"}{" "}
          · periods without sales are omitted
        </p>
        {trend.length ? (
          <div
            className="mt-4 h-56 w-full min-w-0 sm:h-72"
            role="img"
            aria-label="Sales revenue over the selected period. Detailed values are included in the Excel download."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trend}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                />
                <YAxis
                  width={62}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(value) => formatINR(Number(value), { compact: true })}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    borderRadius: 12,
                  }}
                  formatter={(value) => formatINR(Number(value))}
                />
                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill="#17552f"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="grid h-56 place-items-center text-sm text-muted-foreground sm:h-72">
            No sales for this period.
          </div>
        )}
      </Card>

      <Card className="min-w-0 p-4 sm:p-5">
        <h2 className="font-bold">Payment mode split</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid bill totals by payment method
        </p>
        {payments.length ? (
          <div className="mx-auto mt-2 h-44 w-full min-w-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payments}
                  dataKey="total"
                  nameKey="method"
                  innerRadius="60%"
                  outerRadius="90%"
                  isAnimationActive={false}
                >
                  {payments.map((p) => (
                    <Cell key={p.method} fill={colors[p.method]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatINR(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="grid h-44 place-items-center text-sm text-muted-foreground">
            No payments for this period.
          </div>
        )}
        <div className="divide-y divide-border">
          {data.payments
            .filter((p) => p.method !== "UNKNOWN" || p.count > 0)
            .map((p) => (
              <div
                key={p.method}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: colors[p.method] }}
                  />
                  {names[p.method]}{" "}
                  <span className="text-xs text-muted-foreground">
                    {p.count} {p.count === 1 ? "bill" : "bills"}
                  </span>
                </span>
                <strong className="tabular-nums">{formatINR(p.total)}</strong>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
