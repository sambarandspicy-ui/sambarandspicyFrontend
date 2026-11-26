"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = Primitive.Root;
export const SelectValue = Primitive.Value;
export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger> & { error?: boolean }
>(function SelectTrigger({ className, children, error, ...props }, ref) {
  const invalid = Boolean(error || props["aria-invalid"]);
  return (
    <Primitive.Trigger
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-base text-foreground transition-shadow outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm",
        invalid &&
          "border-destructive focus:border-destructive focus:ring-destructive/25 focus-visible:border-destructive focus-visible:ring-destructive/25",
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
});
export const SelectContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(function SelectContent(
  { className, children, position = "popper", ...props },
  ref,
) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        ref={ref}
        position={position}
        className={cn(
          "z-[80] min-w-[10rem] overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
          className,
        )}
        {...props}
      >
        <Primitive.Viewport>{children}</Primitive.Viewport>
      </Primitive.Content>
    </Primitive.Portal>
  );
});
export const SelectItem = React.forwardRef<
  React.ElementRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <Primitive.Item
      ref={ref}
      className={cn(
        "relative flex min-h-10 cursor-default items-center rounded-lg py-2 pr-8 pl-3 text-sm outline-none focus:bg-muted data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <Primitive.ItemText>{children}</Primitive.ItemText>
      <span className="absolute right-2">
        <Primitive.ItemIndicator>
          <Check className="size-4 text-primary" />
        </Primitive.ItemIndicator>
      </span>
    </Primitive.Item>
  );
});
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select"> & { error?: boolean }
>(function NativeSelect({ className, error, ...props }, ref) {
  const invalid = Boolean(error || props["aria-invalid"]);
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground transition-shadow outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm",
        invalid &&
          "border-destructive focus:border-destructive focus:ring-destructive/25 focus-visible:border-destructive focus-visible:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
});
