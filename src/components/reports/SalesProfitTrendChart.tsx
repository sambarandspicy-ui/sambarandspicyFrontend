"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportPeriod, SalesTrendPoint } from "@/types/domain";
import { formatINR } from "@/lib/format";
import { trendBuckets } from "./reportData";

export function SalesProfitTrendChart({
  period,
  points,
  onReset,
}: {
  period: ReportPeriod;
  points: SalesTrendPoint[];
  onReset: () => void;
}) {
  const data = trendBuckets(period, points);

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex justify-between gap-3 border-b border-border p-4 sm:p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Sales &amp; operational profit</h2>
          <p>Revenue and estimated profit over the selected period.</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-5 text-sm text-muted-foreground">
          <span>No transactions in this period.</span>
          <Button variant="outline" onClick={onReset}>
            Reset period
          </Button>
        </div>
      ) : (
        <div className="h-56 w-full min-w-0 p-2 sm:h-72 sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                width={64}
                tickFormatter={(v) => formatINR(Number(v), { compact: true })}
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                isAnimationActive={false}
                dataKey="sales"
                name="Sales revenue"
                fill="#17552f"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                isAnimationActive={false}
                dataKey="profit"
                name="Estimated operational profit"
                fill="#b58a27"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
