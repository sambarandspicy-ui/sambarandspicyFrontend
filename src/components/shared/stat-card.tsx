import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  subtext,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "brand" | "success" | "warning" | "critical";
  className?: string;
}) {
  const colors = {
    default: "bg-muted text-foreground",
    brand: "bg-blue-50 text-blue-700",
    success: "bg-green-50 text-green-700",
    warning: "bg-amber-50 text-amber-700",
    critical: "bg-red-50 text-red-700",
  };
  return (
    <Card
      className={cn(
        "flex min-w-0 justify-between gap-2 p-3 sm:gap-3 sm:p-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className="mt-3 truncate text-lg font-extrabold tabular-nums text-foreground sm:text-2xl"
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </div>
      {icon && (
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            colors[tone],
          )}
        >
          {icon}
        </span>
      )}
    </Card>
  );
}
