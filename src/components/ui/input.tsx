import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function Input({ className, type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
});

export { NativeSelect as Select } from "./select";
export { Textarea } from "./textarea";
