import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-card text-card-foreground",
      info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
      warning:
        "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
      destructive:
        "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
      success:
        "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
    },
  },
  defaultVariants: { variant: "default" },
});
export function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props} />
  );
}
export function AlertTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return <h3 className={cn("mb-1 font-semibold", className)} {...props} />;
}
export function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("text-sm leading-relaxed", className)} {...props} />
  );
}
