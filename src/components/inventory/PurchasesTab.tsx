"use client";
import { useState } from "react";
import { Search } from "lucide-react";
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
import type {
  InventoryItem,
  StockPurchase,
  StockPurchaseLine,
} from "@/types/domain";
import { formatINR } from "@/lib/format";
import { DateFilters, inDates, qty, unitCost } from "./shared";

export function PurchasesTab({
  purchases,
  items,
}: {
  purchases: (StockPurchase & { lines: StockPurchaseLine[] })[];
  items: InventoryItem[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const rows = purchases
    .filter(
      (p) =>
        inDates(p.business_date, from, to) &&
        `${p.supplier_name ?? ""} ${p.purchase_reference ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
    )
    .sort(
      (a, b) => b.business_date.localeCompare(a.business_date) || b.id - a.id,
    );

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2>Buying stock</h2>
        <p>Purchase history and line items.</p>
      </div>
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 [&_label]:block [&_label]:text-sm [&_label]:font-semibold">
        <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <label>
          Search
          <Input
            containerClassName="mt-2"
            leadingIcon={<Search size={16} />}
            clearable
            clearLabel="Clear search"
            onClear={() => setSearch("")}
            placeholder="Supplier or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No purchases match these filters.
        </p>
      ) : (
        <div className="space-y-3 p-4 sm:p-5">
          {rows.map((p) => (
            <details className="rounded-xl border border-border bg-muted/20 p-3.5 sm:p-4" key={p.id}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <strong className="block truncate">
                    {p.purchase_reference || `Purchase #${p.id}`}
                  </strong>
                  <small className="text-xs text-muted-foreground">
                    {p.business_date} · {p.supplier_name || "No supplier"} · User #
                    {p.created_by}
                  </small>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="mr-2 text-xs text-muted-foreground">
                    {p.lines.length} items
                  </span>
                  <strong className="text-primary dark:text-[#ebc96f]">
                    {formatINR(p.total_amount)}
                  </strong>
                </span>
              </summary>

              {/* Mobile card list for line items */}
              <div className="mt-3 space-y-2 md:hidden">
                {p.lines.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-xs tabular-nums"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">
                        {items.find((i) => i.id === l.inventory_item_id)?.name ??
                          `Item #${l.inventory_item_id}`}
                      </strong>
                      <span className="text-muted-foreground">
                        {qty(l.quantity)} × {unitCost(l.unit_cost)}
                      </span>
                    </div>
                    <strong className="shrink-0 text-sm">
                      {formatINR(l.line_total)}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="mt-3 hidden w-full overflow-x-auto md:block">
                <Table className="w-full text-left text-sm tabular-nums">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit cost</TableHead>
                      <TableHead>Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          {items.find((i) => i.id === l.inventory_item_id)
                            ?.name ?? `Item #${l.inventory_item_id}`}
                        </TableCell>
                        <TableCell>{qty(l.quantity)}</TableCell>
                        <TableCell>{unitCost(l.unit_cost)}</TableCell>
                        <TableCell>{formatINR(l.line_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
