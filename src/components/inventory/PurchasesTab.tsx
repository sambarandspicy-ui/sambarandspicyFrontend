"use client";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { useState } from "react";
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
    <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Buying stock</h2>
          <p>Purchase history and line items.</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 [&_label]:text-sm [&_label]:font-semibold [&_input]:mt-2 [&_select]:mt-2">
        <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <label>
          Search
          <Input
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
        <div className="space-y-3 p-4">
          {rows.map((p) => (
            <details className="rounded-xl border border-border p-4" key={p.id}>
              <summary>
                <span>
                  <strong>{p.purchase_reference || `Purchase #${p.id}`}</strong>
                  <small>
                    {p.business_date} - {p.supplier_name || "No supplier"} -
                    User #{p.created_by}
                  </small>
                </span>
                <span>
                  {p.lines.length} items{" "}
                  <strong>{formatINR(p.total_amount)}</strong>
                </span>
              </summary>
              <div className="w-full overflow-x-auto">
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
