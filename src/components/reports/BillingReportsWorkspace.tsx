"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Download,
  ReceiptText,
  ShoppingBasket,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { QueryError, QuerySkeleton } from "@/components/shared/QueryState";
import { ReceiptDialog } from "@/components/billing/ReceiptDialog";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/services/api";
import { queryKeys } from "@/hooks/queries";
import { formatINR, getBusinessDateIST, resolvePeriodRange } from "@/lib/format";
import type { BillDetail, ReportPeriod } from "@/types/domain";
import { buildBillingReport } from "./billingReportData";
import { displayDate, rangeLabel } from "./reportData";
import { BillingSalesCharts } from "./BillingSalesCharts";

const periods: { id: ReportPeriod; label: string }[] = [
  { id: "DAILY", label: "Daily" },
  { id: "WEEKLY", label: "Weekly" },
  { id: "MONTHLY", label: "Monthly" },
  { id: "QUARTERLY", label: "Quarterly" },
  { id: "YEARLY", label: "Yearly" },
  { id: "LIFETIME", label: "Lifetime" },
];

export function BillingReportsWorkspace() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [anchor, setAnchor] = useState(getBusinessDateIST);
  const [receipt, setReceipt] = useState<BillDetail | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const range = resolvePeriodRange(period, anchor);
  const bills = useQuery({
    queryKey: [...queryKeys.bills, "report", range],
    queryFn: () => api.listBills(range),
  });
  const menu = useQuery({
    queryKey: queryKeys.menu,
    queryFn: () => api.getMenuItems(),
  });
  const data = bills.data ? buildBillingReport(bills.data) : null;

  async function exportExcel() {
    if (!data || exporting) return;
    setExportError("");
    setExporting(true);
    try {
      const { downloadBillingWorkbook } = await import(
        "@/lib/exports/billingReportExcel"
      );
      downloadBillingWorkbook(data, period, range);
    } catch {
      setExportError("Could not create the Excel file. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Billing reports"
        description="Review paid bills, sales and payment methods."
      />

      <Card className="space-y-3 p-4">
        <div
          className="pos-scroll no-scrollbar flex max-w-full gap-1.5 overflow-x-auto pb-1"
          role="group"
          aria-label="Report period"
        >
          {periods.map((p) => (
            <Button
              key={p.id}
              size="default"
              className="shrink-0 whitespace-nowrap"
              variant={period === p.id ? "default" : "outline"}
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {period !== "LIFETIME" && (
            <label className="space-y-1 text-sm font-semibold">
              Select date
              <Input
                className="w-auto min-w-36"
                type="date"
                value={anchor}
                onChange={(event) => {
                  if (event.target.value) setAnchor(event.target.value);
                }}
              />
            </label>
          )}
          <p className="pb-2 text-sm text-muted-foreground">{rangeLabel(range)}</p>
          <Button
            className="sm:ml-auto"
            variant="success"
            loading={exporting}
            disabled={!data || bills.isFetching}
            leftIcon={<Download size={16} aria-hidden="true" />}
            onClick={() => void exportExcel()}
          >
            {exporting ? "Preparing..." : "Download Excel"}
          </Button>
        </div>
      </Card>

      {exportError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {exportError}
        </p>
      )}

      {bills.isLoading ? (
        <QuerySkeleton />
      ) : bills.isError || !data ? (
        <QueryError
          onRetry={() => {
            void bills.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Sales revenue"
              value={formatINR(data.revenue)}
              subtext="Paid bills only"
              icon={<BarChart3 size={20} aria-hidden="true" />}
              tone="brand"
            />
            <StatCard
              label="Paid bills"
              value={String(data.paid.length)}
              subtext={`Average ${formatINR(data.average)}`}
              icon={<ReceiptText size={20} aria-hidden="true" />}
            />
            <StatCard
              label="Items sold"
              value={String(data.items)}
              icon={<ShoppingBasket size={20} aria-hidden="true" />}
            />
            <StatCard
              label="Discounts"
              value={formatINR(data.discounts)}
              icon={<CreditCard size={20} aria-hidden="true" />}
            />
          </div>

          <BillingSalesCharts data={data} period={period} />

          <Card className="overflow-hidden">
            <div className="border-b border-border p-4 sm:p-5">
              <h2 className="font-bold">Top selling items</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ranked by quantity sold · item revenue before bill round off
              </p>
            </div>
            {data.sellers.length ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dish</TableHead>
                      <TableHead>Qty sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Item revenue share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sellers.map((item) => {
                      const share =
                        data.itemRevenue > 0
                          ? (item.revenue / data.itemRevenue) * 100
                          : null;
                      const dietary = menu.data?.find(
                        (m) => m.id === item.menuItemId,
                      )?.dietary_type;
                      return (
                        <TableRow key={item.menuItemId}>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              {dietary && <DietaryBadge type={dietary} />}
                              <strong>{item.name}</strong>
                            </span>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <strong>{formatINR(item.revenue)}</strong>
                          </TableCell>
                          <TableCell>
                            {share === null ? (
                              "N/A"
                            ) : (
                              <span className="flex items-center gap-3">
                                <span
                                  aria-hidden="true"
                                  className="h-2 w-20 overflow-hidden rounded-full bg-muted"
                                >
                                  <span
                                    className="block h-full bg-primary dark:bg-[#227643]"
                                    style={{
                                      width: `${Math.max(0, Math.min(100, share))}%`,
                                    }}
                                  />
                                </span>
                                <span className="tabular-nums">
                                  {share.toFixed(1)}%
                                </span>
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No dishes sold in this period.
              </p>
            )}
            {menu.data && data.sellers.length > 0 && (
              <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                Dietary symbols reflect the current menu classification.
              </p>
            )}
            {data.roundOff !== 0 && (
              <p className="border-t border-border px-5 py-3 text-sm text-muted-foreground">
                Bill round-off adjustment:{" "}
                <strong className="tabular-nums">
                  {data.roundOff < 0 ? "-" : "+"}
                  {formatINR(Math.abs(data.roundOff))}
                </strong>
                . Paid sales include this adjustment.
              </p>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border p-4 sm:p-5">
              <h2 className="font-bold">Paid bills</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Held and cancelled bills are excluded.
              </p>
            </div>
            {data.paid.length ? (
              <div className="divide-y divide-border">
                {data.paid.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {bill.bill_number ?? `Bill #${bill.id}`}
                      </strong>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {displayDate(bill.business_date)} ·{" "}
                        {bill.payment?.payment_method ?? "Payment unspecified"} ·{" "}
                        {bill.item_count} items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <strong className="tabular-nums text-primary dark:text-[#ebc96f]">
                        {formatINR(bill.total_amount)}
                      </strong>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReceipt(bill)}
                      >
                        View receipt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No paid bills for this period.
              </p>
            )}
          </Card>
        </>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <h2 className="font-bold">Inventory &amp; profit and loss</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These reports are coming soon.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href="/inventory">
            <span>Inventory</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        </Button>
      </Card>

      <ReceiptDialog
        bill={receipt}
        open={!!receipt}
        onOpenChange={(open) => {
          if (!open) setReceipt(null);
        }}
        isReprint
        role={user.role}
        onLogReprint={(id) => api.logBillReprint(id)}
        preview
      />
    </div>
  );
}
