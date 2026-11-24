"use client";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { QueryError } from "@/components/shared/QueryState";
import { useBills, type BillFilters } from "@/hooks/queries";
import { getBusinessDateIST, formatINR } from "@/lib/format";
import type { BillDetail } from "@/types/domain";
function initialFilters(): BillFilters {
  const to = getBusinessDateIST(),
    date = new Date(`${to}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 6);
  return {
    from: date.toISOString().slice(0, 10),
    to,
    search: "",
    paymentMethod: "ALL",
  };
}
export function PastBillsDrawer({
  open,
  onOpenChange,
  onReceipt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceipt: (bill: BillDetail) => void;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const bills = useBills(filters, open);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-5 pr-12 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <SheetTitle>Past Bills</SheetTitle>
            <SheetDescription>
              Find paid or cancelled bills by business date.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="outline"
              className="size-11 p-0"
              aria-label="Close past bills"
            >
              <X size={19} />
            </Button>
          </SheetClose>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-border p-4 text-sm [&_label]:space-y-1">
          <label>
            From
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>
            To
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <label className="col-span-2">
            Bill number
            <Input
              placeholder="Search bill number"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </label>
          <label>
            Payment
            <NativeSelect
              value={filters.paymentMethod}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  paymentMethod: e.target.value as BillFilters["paymentMethod"],
                })
              }
            >
              <option value="ALL">All methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </NativeSelect>
          </label>
        </div>
        {filters.from && filters.to && filters.from > filters.to ? (
          <p className="p-4 text-sm text-destructive">
            From date must be on or before To date.
          </p>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {bills.isLoading ? (
              <p className="flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                Loading bills...
              </p>
            ) : bills.isError ? (
              <QueryError
                onRetry={() => {
                  void bills.refetch();
                }}
              />
            ) : !bills.data?.length ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <p>No bills found for these filters.</p>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setFilters(initialFilters())}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              bills.data.map((b) => (
                <article key={b.id}>
                  <Card className="rounded-xl border border-border bg-card p-4 text-sm">
                    <div className="flex justify-between gap-3 [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted-foreground">
                      <div>
                        <strong>
                          {b.bill_number ?? `Cancelled hold #${b.id}`}
                        </strong>
                        <p>
                          {new Intl.DateTimeFormat("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(
                            new Date(
                              b.paid_at ?? b.cancelled_at ?? b.created_at,
                            ),
                          )}{" "}
                          IST
                        </p>
                      </div>
                      <strong>{formatINR(b.total_amount)}</strong>
                    </div>
                    <p>
                      {b.cashier_name ?? `User #${b.paid_by ?? b.created_by}`}{" "}
                      &middot; {b.item_count} items
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{b.status}</Badge>
                      {b.payment && (
                        <Badge variant="secondary">
                          {b.payment.payment_method}
                        </Badge>
                      )}
                      {b.status === "PAID" && (
                        <Button
                          variant="outline"
                          className="min-h-11"
                          onClick={() => {
                            onOpenChange(false);
                            onReceipt(b);
                          }}
                        >
                          Print receipt
                        </Button>
                      )}
                    </div>
                  </Card>
                </article>
              ))
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
