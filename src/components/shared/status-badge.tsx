import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "critical" | "info";
}) {
  const variants = {
    neutral: "secondary",
    success: "success",
    warning: "warning",
    critical: "destructive",
    info: "info",
  } as const;
  return (
    <Badge variant={variants[tone]}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}
