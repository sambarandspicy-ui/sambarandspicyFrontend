import { formatDecimal, formatINR } from "@/lib/format";
import { paymentSummary, type ReportData } from "./reportData";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
export function ReportsKpiStrip({ data }: { data: ReportData }) {
  const s = data.summary,
    count = data.ledger.length;
  const cards = [
    {
      title: "Sales revenue",
      value: s.sales_revenue,
      sub: `${count} paid bills - Avg ${formatINR(count ? s.sales_revenue / count : 0)}`,
    },
    {
      title: "Stock used + waste",
      value: s.stock_used_cost + s.waste_cost,
      sub:
        s.stock_adjustment_loss > 0
          ? `Adjustment loss ${formatINR(s.stock_adjustment_loss)} separately`
          : "Actual stock removed",
    },
    {
      title: "Operating expenses",
      value: s.operating_expense,
      sub: s.operating_expense
        ? "Recorded for this period"
        : "No operating expenses recorded",
    },
    {
      title:
        s.operating_expense === 0
          ? "Gross operational contribution"
          : "Operational profit",
      value: s.estimated_operating_profit,
      sub: `${s.estimated_operating_margin_percent === null ? "N/A" : `${formatDecimal(s.estimated_operating_margin_percent)}% margin`}${s.operating_expense === 0 ? " - excludes operating expenses" : " - estimated"}`,
    },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.title}
            label={c.title}
            value={formatINR(c.value)}
            subtext={c.sub}
          />
        ))}
      </div>
      <Card className="grid min-w-0 gap-4 p-3 sm:p-5 lg:grid-cols-12 [&_strong]:block [&_strong]:text-lg [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted-foreground">
        <div className="min-w-0 lg:col-span-5">
          <span>Purchase cash outflow</span>
          <strong>{formatINR(s.purchase_cash_outflow)}</strong>
          <p>
            Cash spent buying stock in this period - tracked separately from
            P&amp;L until used or wasted
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-3 gap-2 text-sm lg:col-span-7 [&>div]:min-w-0 [&>div]:rounded-xl [&>div]:bg-muted [&>div]:p-2 [&_strong]:truncate [&_strong]:tabular-nums [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground sm:[&>div]:p-3">
          {paymentSummary(data.ledger).map((p) => (
            <div key={p.method}>
              <span>{p.method}</span>
              <strong>{formatINR(p.total)}</strong>
              <small>{p.count} bills</small>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
