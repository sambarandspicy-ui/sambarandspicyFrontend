"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Existing screens can migrate incrementally using the original Radix names.
export {
  Root,
  Trigger,
  Portal,
  Overlay,
  Close,
  Content,
  Title,
  Description,
} from "@radix-ui/react-dialog";

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content> & {
    showClose?: boolean;
  }
>(function DialogContent(
  { className, children, showClose = true, ...props },
  ref,
) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="fixed inset-0 z-[60] bg-[#092b16]/55 backdrop-blur-xs" />
      <Primitive.Content
        ref={ref}
        className={cn(
          "fixed top-1/2 left-1/2 z-[61] flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 text-card-foreground shadow-xl sm:w-full",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <Primitive.Close
            aria-label="Close"
            className="absolute right-3.5 top-3.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </Primitive.Close>
        )}
      </Primitive.Content>
    </Primitive.Portal>
  );
});
export function DialogHeader({
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
export function DialogBody({
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
export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
