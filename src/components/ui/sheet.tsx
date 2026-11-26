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
    side?: "left" | "right" | "bottom";
    showClose?: boolean;
    closeLabel?: string;
  }
>(function SheetContent(
  { className, children, side = "right", showClose = true, closeLabel = "Close", ...props },
  ref,
) {
  const positionClasses =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-2xl border-t pb-safe"
      : cn(
          "inset-y-0 h-dvh w-[92vw] max-w-full sm:max-w-md",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
        );

  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-[60] bg-[#092b16]/55 backdrop-blur-xs" />
      <Primitive.Content
        ref={ref}
        className={cn(
          "fixed z-[61] flex flex-col overflow-hidden border-border bg-card p-0 text-card-foreground shadow-2xl",
          positionClasses,
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <Primitive.Close
            aria-label={closeLabel}
            className="absolute right-3.5 top-3.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">{closeLabel}</span>
          </Primitive.Close>
        )}
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
      className={cn(
        "flex w-full shrink-0 flex-col gap-1 border-b border-border bg-card px-5 py-4 pr-14 text-left sm:px-6 sm:pr-14",
        className,
      )}
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
      className={cn(
        "pos-scroll min-h-0 w-full flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6",
        className,
      )}
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
      className={cn(
        "w-full shrink-0 border-t border-border bg-card px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
