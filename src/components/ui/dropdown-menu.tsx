"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[80] min-w-44 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-lg",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
});
export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Primitive.Item>,
  React.ComponentPropsWithoutRef<typeof Primitive.Item>
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <Primitive.Item
      ref={ref}
      className={cn(
        "flex min-h-10 cursor-default items-center gap-2 rounded-lg px-3 text-sm outline-none focus:bg-muted data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof Primitive.Label>,
  React.ComponentPropsWithoutRef<typeof Primitive.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <Primitive.Label
      ref={ref}
      className={cn(
        "px-3 py-2 text-xs font-semibold text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});
export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof Primitive.Separator>,
  React.ComponentPropsWithoutRef<typeof Primitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <Primitive.Separator
      ref={ref}
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
});
export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof Primitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof Primitive.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <Primitive.RadioItem
      ref={ref}
      className={cn(
        "relative flex min-h-10 cursor-default items-center rounded-lg py-2 pr-8 pl-3 text-sm outline-none focus:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
      <span className="absolute right-2">
        <Primitive.ItemIndicator>
          <Check className="size-4" />
        </Primitive.ItemIndicator>
      </span>
    </Primitive.RadioItem>
  );
});
