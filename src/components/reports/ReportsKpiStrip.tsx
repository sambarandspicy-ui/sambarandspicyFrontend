import { formatDecimal, formatINR } from "@/lib/format";
import { paymentSummary, type ReportData } from "./reportData";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";

export function ReportsKpiStrip({ data }: { data: ReportData }) {
  const s = data.summary;
  const count = data.ledger.length;
  const cards = [
    {
      title: "Sales revenue",
      value: s.sales_revenue,
      sub: `${count} paid bills - Avg ${formatINR(count ? s.sales_revenue / count : 0)}`,
      tone: "brand" as const,
    },
    {
      title: "Stock used + waste",
      value: s.stock_used_cost + s.waste_cost,
      sub:
        s.stock_adjustment_loss > 0
          ? `Adjustment loss ${formatINR(s.stock_adjustment_loss)} separately`
          : "Actual stock removed",
      tone: "warning" as const,
    },
    {
      title: "Operating expenses",
      value: s.operating_expense,
      sub: s.operating_expense
        ? "Recorded for this period"
        : "No operating expenses recorded",
      tone: "critical" as const,
    },
    {
      title:
        s.operating_expense === 0
          ? "Gross operational contribution"
          : "Operational profit",
      value: s.estimated_operating_profit,
      sub: `${s.estimated_operating_margin_percent === null ? "N/A" : `${formatDecimal(s.estimated_operating_margin_percent)}% margin`}${s.operating_expense === 0 ? " - excludes operating expenses" : " - estimated"}`,
      tone: s.estimated_operating_profit >= 0 ? ("success" as const) : ("critical" as const),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard
            key={c.title}
            label={c.title}
            value={formatINR(c.value)}
            subtext={c.sub}
            tone={c.tone}
          />
        ))}
      </div>
      <Card className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-12 [&_strong]:block [&_strong]:text-lg [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted-foreground">
        <div className="min-w-0 lg:col-span-5">
          <span className="text-sm font-medium text-muted-foreground">
            Purchase cash outflow
          </span>
          <strong className="mt-1 tabular-nums text-foreground">
            {formatINR(s.purchase_cash_outflow)}
          </strong>
          <p>
            Cash spent buying stock in this period - tracked separately from
            P&amp;L until used or wasted
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 text-sm min-[360px]:grid-cols-3 lg:col-span-7 [&>div]:min-w-0 [&>div]:rounded-xl [&>div]:bg-muted/60 [&>div]:p-2.5 [&_strong]:truncate [&_strong]:tabular-nums [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground sm:[&>div]:p-3">
          {paymentSummary(data.ledger).map((p) => (
            <div key={p.method}>
              <span className="text-xs font-semibold text-muted-foreground">
                {p.method}
              </span>
              <strong className="mt-0.5 text-primary dark:text-[#ebc96f]">
                {formatINR(p.total)}
              </strong>
              <small>{p.count} bills</small>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
