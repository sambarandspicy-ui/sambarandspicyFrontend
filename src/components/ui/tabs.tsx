"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = Primitive.Root;
export const TabsList = React.forwardRef<
  React.ElementRef<typeof Primitive.List>,
  React.ComponentPropsWithoutRef<typeof Primitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <Primitive.List
      ref={ref}
      className={cn(
        "pos-scroll no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1",
        className,
      )}
      {...props}
    />
  );
});
export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof Primitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof Primitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <Primitive.Trigger
      ref={ref}
      className={cn(
        "min-h-11 shrink-0 whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs sm:min-h-10",
        className,
      )}
      {...props}
    />
  );
});
export const TabsContent = Primitive.Content;
