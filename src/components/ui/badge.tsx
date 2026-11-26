import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border/70 bg-secondary text-secondary-foreground",
        outline: "border-border bg-card text-foreground",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/80 dark:text-emerald-300",
        warning:
          "border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/70 dark:text-amber-200",
        destructive:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800/70 dark:bg-red-950/80 dark:text-red-300",
        info: "border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/20 dark:text-[#ebc96f]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
