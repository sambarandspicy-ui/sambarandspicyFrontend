"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BillDetail } from "@/types/domain";
import { formatDecimal, formatINR } from "@/lib/format";
import { qty } from "@/components/inventory/shared";
import { istTime, type ReportData } from "./reportData";

const percent = (n: number | null) =>
  n === null ? "N/A" : `${formatDecimal(n)}%`;

export function TopSellersTable({ data }: { data: ReportData }) {
  const [search, setSearch] = useState("");
  const rows = data.sellers.filter((x) =>
    x.item_name.toLowerCase().includes(search.toLowerCase().trim()),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Top-selling menu items</h2>
          <p>Ranked by quantity sold.</p>
        </div>
        <div className="w-full sm:w-64">
          <Input
            aria-label="Search dishes"
            placeholder="Search dishes"
            value={search}
            leadingIcon={<Search size={16} />}
            clearable
            clearLabel="Clear search"
            onClear={() => setSearch("")}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2.5 p-4 md:hidden">
        {rows.map((x) => (
          <div
            key={x.menu_item_id}
            className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <strong className="min-w-0 truncate">
                #{data.sellers.indexOf(x) + 1} · {x.item_name}
              </strong>
              <strong className="shrink-0 tabular-nums text-primary dark:text-[#ebc96f]">
                {formatINR(x.sales_revenue)}
              </strong>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground tabular-nums">
              <span>Qty: {qty(x.quantity_sold)}</span>
              <span>Share: {percent(x.sales_share_percent)}</span>
              <span>
                Est. contrib:{" "}
                {x.estimated_contribution === null
                  ? "N/A"
                  : formatINR(x.estimated_contribution)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Menu item</TableHead>
              <TableHead>Quantity sold</TableHead>
              <TableHead>Sales revenue</TableHead>
              <TableHead>Sales share</TableHead>
              <TableHead>Estimated contribution*</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((x) => (
              <TableRow key={x.menu_item_id}>
                <TableCell>#{data.sellers.indexOf(x) + 1}</TableCell>
                <TableCell>
                  <strong>{x.item_name}</strong>
                </TableCell>
                <TableCell>{qty(x.quantity_sold)}</TableCell>
                <TableCell>{formatINR(x.sales_revenue)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span>{percent(x.sales_share_percent)}</span>
                    <i className="block h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <b
                        className="block h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, x.sales_share_percent ?? 0)}%`,
                        }}
                      />
                    </i>
                  </div>
                </TableCell>
                <TableCell
                  title={
                    x.estimated_contribution === null
                      ? "Cost was missing on at least one sold line"
                      : undefined
                  }
                >
                  {x.estimated_contribution === null
                    ? "N/A"
                    : formatINR(x.estimated_contribution)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!rows.length && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No menu sales match this period.{" "}
          <Button variant="outline" size="sm" onClick={() => setSearch("")}>
            Clear search
          </Button>
        </div>
      )}

      <p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground sm:px-5">
        *Estimated contribution is calculated from captured per-dish cost
        snapshots and is informational only; it is not added to operational
        profit.
      </p>
    </Card>
  );
}

export function SalesLedgerTable({
  data,
  onReceipt,
}: {
  data: ReportData;
  onReceipt: (b: BillDetail) => void;
}) {
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("ALL");
  const rows = data.ledger.filter(
    (x) =>
      (x.bill.bill_number ?? "")
        .toLowerCase()
        .includes(search.toLowerCase().trim()) &&
      (payment === "ALL" || x.payment?.payment_method === payment),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Sales ledger</h2>
          <p>Paid bills in the selected period.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-56">
            <Input
              aria-label="Search bill number"
              placeholder="Search bill number"
              value={search}
              leadingIcon={<Search size={16} />}
              clearable
              clearLabel="Clear search"
              onClear={() => setSearch("")}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <NativeSelect
            className="sm:w-40"
            aria-label="Filter payment method"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          >
            <option value="ALL">All methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </NativeSelect>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2.5 p-4 md:hidden">
        {rows.map((x) => (
          <div
            key={x.bill.id}
            className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <strong className="block truncate">{x.bill.bill_number}</strong>
                <span className="text-xs text-muted-foreground">
                  {x.bill.paid_at ? istTime(x.bill.paid_at) : "-"}
                </span>
              </div>
              <strong className="shrink-0 tabular-nums text-primary dark:text-[#ebc96f]">
                {formatINR(x.bill.total_amount)}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {x.cashier} · {x.bill.item_count} items ·{" "}
                {x.payment?.payment_method ?? "-"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onReceipt({
                    ...x.bill,
                    items: x.items,
                    payment: x.payment,
                    cashier_name: x.cashier,
                  })
                }
              >
                Print receipt
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Bill #</TableHead>
              <TableHead>Date / Time (IST)</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Payment mode</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((x) => (
              <TableRow key={x.bill.id}>
                <TableCell>{x.bill.bill_number}</TableCell>
                <TableCell>
                  {x.bill.paid_at ? istTime(x.bill.paid_at) : "-"}
                </TableCell>
                <TableCell>{x.cashier}</TableCell>
                <TableCell>{x.bill.item_count}</TableCell>
                <TableCell>{x.payment?.payment_method ?? "-"}</TableCell>
                <TableCell>{formatINR(x.bill.total_amount)}</TableCell>
                <TableCell>{x.bill.status}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onReceipt({
                        ...x.bill,
                        items: x.items,
                        payment: x.payment,
                        cashier_name: x.cashier,
                      })
                    }
                  >
                    Print receipt
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!rows.length && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No paid bills match these filters.{" "}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setPayment("ALL");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}
    </Card>
  );
}

export function InventoryWasteTable({ data }: { data: ReportData }) {
  const sum = (
    key:
      | "opening_value"
      | "purchase_value"
      | "used_cost"
      | "waste_cost"
      | "closing_value",
  ) => data.stock.reduce((n, x) => n + Math.round(x[key] * 100), 0) / 100;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2>Stock &amp; waste</h2>
        <p>Quantities and values in the selected period.</p>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2.5 p-4 md:hidden">
        {data.stock.map((x) => (
          <div
            key={x.inventory_item_id}
            className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5 text-xs tabular-nums"
          >
            <div className="flex items-center justify-between gap-2 text-sm">
              <strong>
                {x.name} ({x.unit})
              </strong>
              <span className="font-semibold text-muted-foreground">
                Waste: {percent(x.waste_ratio_percent)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-card p-2.5">
              <span>Used: {qty(x.used_qty)} / {formatINR(x.used_cost)}</span>
              <span className="text-destructive">
                Waste: {qty(x.waste_qty)} / {formatINR(x.waste_cost)}
              </span>
              <span>Open: {qty(x.opening_qty)} / {formatINR(x.opening_value)}</span>
              <span>Close: {qty(x.closing_qty)} / {formatINR(x.closing_value)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Opening qty / value</TableHead>
              <TableHead>Purchases qty / value</TableHead>
              <TableHead>Used qty / cost</TableHead>
              <TableHead>Waste qty / cost</TableHead>
              <TableHead>Closing qty / value</TableHead>
              <TableHead>Waste ratio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.stock.map((x) => (
              <TableRow key={x.inventory_item_id}>
                <TableCell>{x.name}</TableCell>
                <TableCell>{x.unit}</TableCell>
                <TableCell>
                  {qty(x.opening_qty)} / {formatINR(x.opening_value)}
                </TableCell>
                <TableCell>
                  {qty(x.purchase_qty)} / {formatINR(x.purchase_value)}
                </TableCell>
                <TableCell>
                  {qty(x.used_qty)} / {formatINR(x.used_cost)}
                </TableCell>
                <TableCell>
                  {qty(x.waste_qty)} / {formatINR(x.waste_cost)}
                </TableCell>
                <TableCell>
                  {qty(x.closing_qty)} / {formatINR(x.closing_value)}
                </TableCell>
                <TableCell>{percent(x.waste_ratio_percent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableHead>Total</TableHead>
              <TableHead></TableHead>
              <TableHead>{formatINR(sum("opening_value"))}</TableHead>
              <TableHead>{formatINR(sum("purchase_value"))}</TableHead>
              <TableHead>{formatINR(sum("used_cost"))}</TableHead>
              <TableHead>{formatINR(sum("waste_cost"))}</TableHead>
              <TableHead>{formatINR(sum("closing_value"))}</TableHead>
              <TableHead>{percent(data.summary.waste_ratio_percent)}</TableHead>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground sm:px-5">
        Stock values follow posted ledger movements; purchase cash outflow
        remains separate from operating profit.
      </p>
    </Card>
  );
}

export function OperatingExpensesTable({ data }: { data: ReportData }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2>Operating expenses</h2>
        <p>Recorded expenses for this period.</p>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2.5 p-4 md:hidden">
        {data.expenses.map((x) => (
          <div
            key={x.id}
            className="flex items-start justify-between gap-2 rounded-xl border border-border bg-muted/30 p-3.5 text-sm"
          >
            <div className="min-w-0">
              <strong className="block truncate">{x.description}</strong>
              <span className="text-xs text-muted-foreground">
                {x.business_date} · {x.expense_category} · User #{x.created_by}
              </span>
            </div>
            <strong className="shrink-0 tabular-nums text-destructive">
              {formatINR(x.amount)}
            </strong>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Business date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount (INR)</TableHead>
              <TableHead>Recorded by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.expenses.map((x) => (
              <TableRow key={x.id}>
                <TableCell>{x.business_date}</TableCell>
                <TableCell>{x.expense_category}</TableCell>
                <TableCell>{x.description}</TableCell>
                <TableCell>{formatINR(x.amount)}</TableCell>
                <TableCell>User #{x.created_by}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableHead>Total</TableHead>
              <TableHead></TableHead>
              <TableHead></TableHead>
              <TableHead>{formatINR(data.summary.operating_expense)}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {!data.expenses.length && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No operating expenses recorded.
        </p>
      )}
    </Card>
  );
}
