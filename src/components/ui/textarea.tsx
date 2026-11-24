import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
});
