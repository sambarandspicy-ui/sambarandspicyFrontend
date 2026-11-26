"use client";
import { useState } from "react";
import { Toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
} from "lucide-react";
import { QueryError, QuerySkeleton } from "@/components/shared/QueryState";
import { useAuth } from "@/providers/auth-provider";
import { useBilling, useReports, useStoreSettings } from "@/hooks/queries";
import { getBusinessDateIST, resolvePeriodRange } from "@/lib/format";
import type { BillDetail, ReportPeriod } from "@/types/domain";
import { ReceiptDialog } from "@/components/billing/ReceiptDialog";
import { buildReportData, rangeLabel } from "./reportData";
import { ReportsKpiStrip } from "./ReportsKpiStrip";
import { StockEfficiencyCard } from "./StockEfficiencyCard";
import { SalesProfitTrendChart } from "./SalesProfitTrendChart";
import {
  TopSellersTable,
  SalesLedgerTable,
  InventoryWasteTable,
  OperatingExpensesTable,
} from "./ReportTables";
import { AddExpenseDialog } from "./AddExpenseDialog";
const periods: { id: ReportPeriod; label: string }[] = [
  { id: "DAILY", label: "Daily" },
  { id: "WEEKLY", label: "Weekly" },
  { id: "MONTHLY", label: "Monthly" },
  { id: "QUARTERLY", label: "Quarterly" },
  { id: "YEARLY", label: "Yearly" },
  { id: "LIFETIME", label: "Lifetime" },
];
type Tab = "sellers" | "ledger" | "stock" | "expenses";
const tabs: { id: Tab; label: string }[] = [
  { id: "sellers", label: "Top-selling menu items" },
  { id: "ledger", label: "Sales ledger" },
  { id: "stock", label: "Stock & waste" },
  { id: "expenses", label: "Operating expenses" },
];
export function ReportsWorkspace() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<ReportPeriod>("MONTHLY");
  const [anchor, setAnchor] = useState(() => getBusinessDateIST());
  const [tab, setTab] = useState<Tab>("sellers");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [receipt, setReceipt] = useState<BillDetail | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [message, setMessage] = useState("");
  const range = resolvePeriodRange(period, anchor);
  const reports = useReports(range);
  const settings = useStoreSettings();
  const billing = useBilling();
  const queries = [
    reports.summary,
    reports.ledger,
    reports.items,
    reports.inventory,
    reports.waste,
    reports.expenses,
    settings,
  ];
  const loading = queries.some((q) => q.isLoading);
  const failed = queries.some((q) => q.isError);
  const data =
    reports.summary.data &&
    reports.ledger.data &&
    reports.items.data &&
    reports.inventory.data &&
    reports.waste.data &&
    reports.expenses.data &&
    settings.data
      ? buildReportData({
          period,
          range,
          store: settings.data,
          summary: reports.summary.data,
          ledger: reports.ledger.data,
          items: reports.items.data,
          inventory: reports.inventory.data,
          waste: reports.waste.data,
          expenses: reports.expenses.data,
        })
      : null;
  function shift(direction: number) {
    const boundary = direction < 0 ? range.from : range.to;
    if (!boundary) return;
    const date = new Date(`${boundary}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + direction);
    setAnchor(date.toISOString().slice(0, 10));
  }
  async function runExport(kind: "xlsx" | "pdf") {
    if (!data || exporting) return;
    setExporting(kind);
    setMessage("");
    try {
      const tools = await import("@/lib/exports/reportExports");
      if (kind === "xlsx") tools.exportExcel(data);
      else tools.exportPdf(data);
    } catch {
      setMessage("Could not generate the report. Please try again.");
    } finally {
      setExporting(null);
    }
  }
  if (!user) return null;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Reports & analytics"
        description="Review sales, costs and operating performance."
      />
      {message && <Toast message={message} onDismiss={() => setMessage("")} />}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div
          className="pos-scroll no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1"
          role="group"
          aria-label="Report period"
        >
          {periods.map((p) => (
            <Button
              key={p.id}
              variant={period === p.id ? "default" : "ghost"}
              size="default"
              className="shrink-0 whitespace-nowrap"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {period !== "LIFETIME" && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0"
                  aria-label="Previous period"
                  onClick={() => shift(-1)}
                >
                  <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
                </Button>
                <label className="sr-only" htmlFor="report-anchor">
                  Anchor date
                </label>
                <Input
                  className="w-auto min-w-36"
                  id="report-anchor"
                  type="date"
                  value={anchor}
                  onChange={(e) => {
                    if (e.target.value) setAnchor(e.target.value);
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0"
                  aria-label="Next period"
                  onClick={() => shift(1)}
                >
                  <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                </Button>
              </>
            )}
            {period !== "LIFETIME" && (
              <Badge variant="secondary">{rangeLabel(range)}</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="success"
              size="default"
              loading={exporting === "xlsx"}
              disabled={!data || loading || !!exporting}
              leftIcon={<Download size={16} aria-hidden="true" />}
              onClick={() => void runExport("xlsx")}
            >
              {exporting === "xlsx" ? "Generating..." : "Export Excel"}
            </Button>
            <Button
              variant="warning"
              size="default"
              loading={exporting === "pdf"}
              disabled={!data || loading || !!exporting}
              leftIcon={<FileText size={16} aria-hidden="true" />}
              onClick={() => void runExport("pdf")}
            >
              {exporting === "pdf" ? "Generating..." : "Export PDF"}
            </Button>
            {user.role === "ADMIN" && (
              <Button
                size="default"
                leftIcon={<Plus size={16} aria-hidden="true" />}
                onClick={() => setExpenseOpen(true)}
              >
                Add expense
              </Button>
            )}
          </div>
        </div>
      </div>
      {loading ? (
        <QuerySkeleton />
      ) : failed || !data ? (
        <QueryError
          onRetry={() => {
            void Promise.all(
              queries.filter((q) => q.isError).map((q) => q.refetch()),
            );
          }}
        />
      ) : (
        <>
          <ReportsKpiStrip data={data} />
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <SalesProfitTrendChart
              period={period}
              points={data.trend}
              onReset={() => {
                setPeriod("MONTHLY");
                setAnchor(getBusinessDateIST());
              }}
            />
            <StockEfficiencyCard summary={data.summary} />
          </div>
          <nav
            className="pos-scroll no-scrollbar flex max-w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1"
            aria-label="Report sections"
            role="group"
          >
            {tabs.map((t) => (
              <Button
                key={t.id}
                variant={tab === t.id ? "default" : "ghost"}
                size="default"
                className="shrink-0 whitespace-nowrap"
                aria-current={tab === t.id ? "page" : undefined}
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </nav>
          {tab === "sellers" ? (
            <TopSellersTable data={data} />
          ) : tab === "ledger" ? (
            <SalesLedgerTable data={data} onReceipt={setReceipt} />
          ) : tab === "stock" ? (
            <InventoryWasteTable data={data} />
          ) : (
            <OperatingExpensesTable data={data} />
          )}
        </>
      )}
      {user.role === "ADMIN" && expenseOpen && (
        <AddExpenseDialog
          onClose={() => setExpenseOpen(false)}
          pending={reports.createExpense.isPending}
          onSave={async (value) => {
            await reports.createExpense.mutateAsync(value);
            setMessage("Operating expense recorded.");
          }}
        />
      )}
      <ReceiptDialog
        bill={receipt}
        open={!!receipt}
        onOpenChange={(open) => {
          if (!open) setReceipt(null);
        }}
        isReprint
        role={user.role}
        onLogReprint={(id) => billing.reprint.mutateAsync(id)}
        preview
      />
    </div>
  );
}
