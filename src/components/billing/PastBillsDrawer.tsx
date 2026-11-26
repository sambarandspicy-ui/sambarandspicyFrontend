"use client";
import { useMemo, useState } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { QueryError } from "@/components/shared/QueryState";
import { useBills, type BillFilters } from "@/hooks/queries";
import { useBillingSync } from "@/hooks/useBillingSync";
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
  const { queuedBills, retryBill } = useBillingSync();

  const mergedBills = useMemo(() => {
    const serverBills = bills.data ?? [];
    const seenClientIds = new Set<string>();
    const seenBillNumbers = new Set<string>();
    const seenCheckoutKeys = new Set<string>();

    for (const sb of serverBills) {
      const clientId = sb.clientBillId ?? sb.client_bill_id;
      if (clientId) seenClientIds.add(clientId);
      if (sb.bill_number) seenBillNumbers.add(sb.bill_number);
      if (sb.checkout_key) seenCheckoutKeys.add(sb.checkout_key);
    }

    const search = filters.search.trim().toLowerCase();
    const unsyncedMatches = queuedBills
      .map((q) => q.localBill)
      .filter((lb) => {
        const clientId = lb.clientBillId ?? lb.client_bill_id;
        if (clientId && seenClientIds.has(clientId)) return false;
        if (lb.bill_number && seenBillNumbers.has(lb.bill_number)) return false;
        if (lb.checkout_key && seenCheckoutKeys.has(lb.checkout_key)) return false;
        if (filters.from && lb.business_date < filters.from) return false;
        if (filters.to && lb.business_date > filters.to) return false;
        if (
          filters.paymentMethod !== "ALL" &&
          lb.payment?.payment_method !== filters.paymentMethod
        ) {
          return false;
        }
        if (search && !lb.bill_number?.toLowerCase().includes(search)) {
          return false;
        }
        return lb.status === "PAID" || lb.status === "CANCELLED";
      });

    return [...unsyncedMatches, ...serverBills].sort((a, b) =>
      (b.paid_at ?? b.cancelled_at ?? b.created_at).localeCompare(
        a.paid_at ?? a.cancelled_at ?? a.created_at,
      ),
    );
  }, [bills.data, queuedBills, filters]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold">Past Bills</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Find paid or cancelled bills by business date.
          </SheetDescription>
        </SheetHeader>

        <div className="grid shrink-0 grid-cols-1 gap-2.5 border-b border-border bg-secondary/40 px-5 py-4 text-sm min-[360px]:grid-cols-2 sm:px-6 [&_label]:space-y-1 [&_label]:font-medium">
          <label className="min-w-0">
            From
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label className="min-w-0">
            To
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <label className="min-w-0 min-[360px]:col-span-2">
            Bill number
            <Input
              placeholder="Search bill number"
              value={filters.search}
              leadingIcon={<Search size={16} />}
              clearable
              clearLabel="Clear bill search"
              onClear={() => setFilters({ ...filters, search: "" })}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </label>
          <label className="min-w-0 min-[360px]:col-span-2">
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
          <p className="p-4 text-sm font-medium text-destructive" role="alert">
            From date must be on or before To date.
          </p>
        ) : (
          <SheetBody className="space-y-3 p-4 sm:p-4">
            {bills.isLoading && !mergedBills.length ? (
              <p className="flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                Loading bills...
              </p>
            ) : bills.isError && !mergedBills.length ? (
              <QueryError
                onRetry={() => {
                  void bills.refetch();
                }}
              />
            ) : !mergedBills.length ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <p>No bills found for these filters.</p>
                <Button
                  variant="outline"
                  onClick={() => setFilters(initialFilters())}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <>
                {bills.isError && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200">
                    <span>
                      Showing offline queued bills; server history unavailable.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-8 px-2 text-xs"
                      onClick={() => void bills.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                )}
                {mergedBills.map((b) => {
                  const clientId = b.clientBillId ?? b.client_bill_id;
                  return (
                    <article key={clientId ?? b.id}>
                      <Card className="p-4 text-sm">
                        <div className="flex justify-between gap-3 [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted-foreground">
                          <div className="min-w-0">
                            <strong className="block truncate">
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
                          <strong className="shrink-0 tabular-nums text-primary dark:text-[#ebc96f]">
                            {formatINR(b.total_amount)}
                          </strong>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {b.cashier_name ?? `User #${b.paid_by ?? b.created_by}`}{" "}
                          &middot; {b.item_count} items
                        </p>
                        {b.syncStatus === "FAILED" && b.syncError && (
                          <p className="mt-1 text-xs text-destructive" role="alert">
                            {b.syncError}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{b.status}</Badge>
                          {b.payment && (
                            <Badge variant="secondary">
                              {b.payment.payment_method}
                            </Badge>
                          )}
                          {b.syncStatus && b.syncStatus !== "SYNCED" && (
                            <Badge
                              variant={
                                b.syncStatus === "FAILED"
                                  ? "destructive"
                                  : "warning"
                              }
                              title={b.syncError ?? undefined}
                            >
                              {b.syncStatus === "FAILED"
                                ? "Sync failed"
                                : b.syncStatus === "SYNCING"
                                  ? "Syncing"
                                  : "Pending sync"}
                            </Badge>
                          )}
                          {b.syncStatus === "FAILED" && clientId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void retryBill(clientId);
                              }}
                            >
                              Retry
                            </Button>
                          )}
                          {b.status === "PAID" && (
                            <Button
                              variant="outline"
                              size="sm"
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
                  );
                })}
              </>
            )}
          </SheetBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
