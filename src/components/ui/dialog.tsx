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
      <Primitive.Overlay className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs" />
      <Primitive.Content
        ref={ref}
        className={cn(
          "fixed top-1/2 left-1/2 z-[61] flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:w-full sm:p-6",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <Primitive.Close className="absolute top-4 right-4 rounded-lg p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="size-4" />
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
      className={cn("flex flex-col gap-2 pr-8 text-left", className)}
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
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
