"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <Primitive.Root
      ref={ref}
      className={cn(
        "inline-flex h-7 w-12 items-center rounded-full bg-slate-400 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:bg-success disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="block size-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" />
    </Primitive.Root>
  );
});
