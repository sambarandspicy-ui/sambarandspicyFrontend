"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

const ColumnLabels = React.createContext<string[]>([]);
const FooterRow = React.createContext(false);

function textContent(value: React.ReactNode): string {
  return React.Children.toArray(value)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number")
        return String(child);
      if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return textContent(child.props.children);
      }
      return "";
    })
    .join("");
}

function getColumnLabels(children: React.ReactNode): string[] {
  const header = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === TableHeader,
  );
  if (!React.isValidElement<{ children?: React.ReactNode }>(header)) return [];
  const row = React.Children.toArray(header.props.children).find(
    (child) => React.isValidElement(child) && child.type === TableRow,
  );
  if (!React.isValidElement<{ children?: React.ReactNode }>(row)) return [];
  return React.Children.toArray(row.props.children).map((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child)
      ? textContent(child.props.children).trim()
      : "",
  );
}

export const Table = React.forwardRef<
  HTMLTableElement,
  React.ComponentProps<"table">
>(function Table({ className, children, ...props }, ref) {
  const labels = getColumnLabels(children);
  return (
    <div className="relative min-w-0 w-full">
      <div className="w-full overflow-x-auto">
        <ColumnLabels.Provider value={labels}>
          <table
            ref={ref}
            role="table"
            className={cn(
              "responsive-record-table w-full min-w-[600px] caption-bottom text-left text-sm whitespace-nowrap tabular-nums",
              className,
            )}
            {...props}
          >
            {children}
          </table>
        </ColumnLabels.Provider>
      </div>
    </div>
  );
});
export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      role="rowgroup"
      className={cn("sticky top-0 bg-muted text-muted-foreground", className)}
      {...props}
    />
  );
}
export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      role="rowgroup"
      className={cn("md:[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}
export function TableFooter({
  className,
  ...props
}: React.ComponentProps<"tfoot">) {
  return (
    <FooterRow.Provider value={true}>
      <tfoot
        role="rowgroup"
        className={cn("border-t border-border bg-muted font-medium", className)}
        {...props}
      />
    </FooterRow.Provider>
  );
}
export function TableRow({
  className,
  children,
  ...props
}: React.ComponentProps<"tr">) {
  const labels = React.useContext(ColumnLabels);
  const footer = React.useContext(FooterRow);
  const cells = React.Children.map(children, (child, index) => {
    if (
      React.isValidElement<
        React.ComponentProps<"td"> & { "data-label"?: string }
      >(child) &&
      (child.type === TableCell || (footer && child.type === TableHead))
    ) {
      return React.cloneElement(child, {
        "data-label": child.props["data-label"] ?? labels[index] ?? "",
      });
    }
    return child;
  });
  return (
    <tr
      role="row"
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/50",
        className,
      )}
      {...props}
    >
      {cells}
    </tr>
  );
}
export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      role="columnheader"
      className={cn(
        "h-11 px-4 text-left align-middle text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}
export function TableCell({
  className,
  children,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td role="cell" className={cn("p-4 align-middle", className)} {...props}>
      <div className="record-value">{children}</div>
    </td>
  );
}
export function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
