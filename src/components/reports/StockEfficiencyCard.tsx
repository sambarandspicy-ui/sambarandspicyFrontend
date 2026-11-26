import { Card } from "@/components/ui/card";
import { formatDecimal, formatINR } from "@/lib/format";
import type { FinancialSummaryReport } from "@/types/domain";

export function StockEfficiencyCard({
  summary: s,
}: {
  summary: FinancialSummaryReport;
}) {
  const total = s.stock_used_cost + s.waste_cost;

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2>Stock efficiency</h2>
        <p>Stock cost recorded during the period.</p>
      </div>
      <div className="space-y-3 p-4 text-sm sm:p-5 [&>div]:flex [&>div]:justify-between [&>div]:gap-2">
        <div>
          <span className="text-muted-foreground">Kitchen stock used</span>
          <strong className="tabular-nums">
            {formatINR(s.stock_used_cost)}
          </strong>
        </div>
        <div>
          <span className="text-muted-foreground">Wasted stock value</span>
          <strong className="tabular-nums text-destructive">
            {formatINR(s.waste_cost)}
          </strong>
        </div>
        {s.stock_adjustment_loss > 0 && (
          <div>
            <span className="text-muted-foreground">Stock adjustment loss</span>
            <strong className="tabular-nums">
              {formatINR(s.stock_adjustment_loss)}
            </strong>
          </div>
        )}
        <div className="font-bold tabular-nums">
          <span>Waste ratio</span>
          <strong>
            {s.waste_ratio_percent === null
              ? "N/A"
              : `${formatDecimal(s.waste_ratio_percent)}%`}
          </strong>
        </div>
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
          aria-label={`Used ${formatINR(s.stock_used_cost)}, wasted ${formatINR(s.waste_cost)}`}
        >
          <span
            className="block h-full bg-primary dark:bg-[#227643]"
            style={{
              width: `${total ? (s.stock_used_cost / total) * 100 : 0}%`,
            }}
          />
          <span
            className="block h-full bg-destructive"
            style={{ width: `${total ? (s.waste_cost / total) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Used vs. wasted stock value
        </p>
        <small className="block text-xs text-muted-foreground">
          Waste ratio = waste value / (used value + waste value)
        </small>
      </div>
    </Card>
  );
}
