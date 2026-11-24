"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Primitive.Root;
export const SheetTrigger = Primitive.Trigger;
export const SheetClose = Primitive.Close;
export const SheetTitle = Primitive.Title;
export const SheetDescription = Primitive.Description;
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content> & {
    side?: "left" | "right";
  }
>(function SheetContent(
  { className, children, side = "right", ...props },
  ref,
) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs" />
      <Primitive.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 z-[61] flex h-dvh w-full max-w-full flex-col border-border bg-card text-card-foreground shadow-xl sm:max-w-md",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Close className="absolute top-4 right-4 rounded-lg p-2 text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
});
export function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("shrink-0 border-b border-border p-6 pr-14", className)}
      {...props}
    />
  );
}
export function SheetBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 overflow-y-auto p-6", className)}
      {...props}
    />
  );
}
export function SheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("shrink-0 border-t border-border p-6", className)}
      {...props}
    />
  );
}
