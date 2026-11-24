import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DataTableCard({
  title,
  description,
  count,
  actions,
  filters,
  children,
  empty,
}: {
  title: string;
  description?: string;
  count?: number;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  empty?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="font-semibold text-foreground">
            {title}{" "}
            {count !== undefined && (
              <span className="text-muted-foreground">({count})</span>
            )}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {filters && <div className="border-b border-border p-5">{filters}</div>}
      {empty ?? children}
    </Card>
  );
}
