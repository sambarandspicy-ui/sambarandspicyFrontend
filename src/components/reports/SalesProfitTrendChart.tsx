"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
    <Card className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="flex justify-between gap-3 border-b border-border p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Sales &amp; operational profit</h2>
          <p>Revenue and estimated profit over the selected period.</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-5 text-sm text-muted-foreground">
          <span>No transactions in this period.</span>
          <Button variant="outline" className="min-h-11" onClick={onReset}>
            Reset period
          </Button>
        </div>
      ) : (
        <div className="h-[240px] w-full p-2 sm:h-[300px] sm:p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
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
                width={72}
                tickFormatter={(v) => formatINR(Number(v), { compact: true })}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                  borderRadius: 10,
                }}
                formatter={(value) => formatINR(Number(value))}
              />
              <Legend />
              <Bar
                isAnimationActive={false}
                dataKey="sales"
                name="Sales revenue"
                fill="#2563eb"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                isAnimationActive={false}
                dataKey="profit"
                name="Estimated operational profit"
                fill="#16a34a"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
