import { Boxes, CircleCheck, TriangleAlert, CircleAlert } from "lucide-react";
import type { InventoryItem } from "@/types/domain";
import { getStockStatus } from "@/lib/calculations";
import { StatCard } from "@/components/shared/stat-card";
export function InventoryKpiCards({ items }: { items: InventoryItem[] }) {
  const active = items.filter((i) => i.is_active);
  const counts = [
    active.length,
    ...(["HEALTHY", "LOW", "CRITICAL"] as const).map(
      (s) =>
        active.filter(
          (i) =>
            getStockStatus(
              i.current_qty,
              i.min_limit_qty,
              i.critical_limit_qty,
            ) === s,
        ).length,
    ),
  ];
  const cards = [
    { title: "Tracked ingredients", icon: Boxes, tone: "brand" },
    { title: "Healthy items", icon: CircleCheck, tone: "success" },
    { title: "Low-stock warnings", icon: TriangleAlert, tone: "warning" },
    { title: "Critical stock alerts", icon: CircleAlert, tone: "critical" },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((c, i) => (
        <StatCard
          key={c.title}
          label={c.title}
          value={counts[i]}
          tone={c.tone}
          className={
            counts[i] > 0 && c.tone === "critical"
              ? "border-red-400"
              : counts[i] > 0 && c.tone === "warning"
                ? "border-amber-400"
                : undefined
          }
          icon={<c.icon size={19} />}
        />
      ))}
    </div>
  );
}
