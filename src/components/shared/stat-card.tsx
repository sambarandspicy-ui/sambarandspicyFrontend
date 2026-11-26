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
    brand: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-[#ebc96f]",
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
    warning:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200",
    critical:
      "bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300",
  };
  return (
    <Card
      className={cn(
        "flex min-w-0 justify-between gap-2 p-4 sm:gap-3 sm:p-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p
          className="mt-2.5 truncate text-lg font-extrabold tabular-nums text-foreground sm:mt-3 sm:text-2xl"
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
