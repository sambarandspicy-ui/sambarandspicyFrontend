"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <Primitive.Root
      ref={ref}
      className={cn(
        "size-5 shrink-0 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Primitive.Indicator className="flex items-center justify-center">
        <Check className="size-4" />
      </Primitive.Indicator>
    </Primitive.Root>
  );
});
