"use client";
import { NativeSelect } from "@/components/ui/select";
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
import type { InventoryItem, StockMovement } from "@/types/domain";
import { formatINR } from "@/lib/format";
import {
  DateFilters,
  ItemSelect,
  dateTime,
  inDates,
  qty,
  unitCost,
} from "./shared";
export function StockHistoryTab({
  movements,
  items,
  selected,
  onSelected,
}: {
  movements: StockMovement[];
  items: InventoryItem[];
  selected: string;
  onSelected: (v: string) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("ALL");
  const rows = movements
    .filter(
      (m) =>
        (!selected || m.inventory_item_id === Number(selected)) &&
        (type === "ALL" || m.movement_type === type) &&
        inDates(m.business_date, from, to),
    )
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.id - a.id);
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Stock history</h2>
          <p>Immutable stock movements and cost snapshots.</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 [&_label]:text-sm [&_label]:font-semibold [&_input]:mt-2 [&_select]:mt-2">
        <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <ItemSelect items={items} value={selected} onChange={onSelected} all />
        <label>
          Movement type
          <NativeSelect value={type} onChange={(e) => setType(e.target.value)}>
            {[
              "ALL",
              "PURCHASE",
              "DAILY_USE",
              "WASTE",
              "OPENING",
              "ADJUSTMENT_IN",
              "ADJUSTMENT_OUT",
            ].map((t) => (
              <option value={t} key={t}>
                {t === "ALL" ? "All movements" : t.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Business date / time</TableHead>
              <TableHead>Ingredient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qty delta</TableHead>
              <TableHead>Unit cost snapshot</TableHead>
              <TableHead>Cost value</TableHead>
              <TableHead>Balance after</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  {m.business_date}
                  <small>Posted {dateTime(m.recorded_at)}</small>
                </TableCell>
                <TableCell>
                  {items.find((i) => i.id === m.inventory_item_id)?.name ??
                    `Item #${m.inventory_item_id}`}
                </TableCell>
                <TableCell>
                  <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs font-semibold">
                    {m.movement_type.replaceAll("_", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  {m.quantity_delta > 0 ? "+" : ""}
                  {qty(m.quantity_delta)}
                </TableCell>
                <TableCell>{unitCost(m.cost_per_unit_snapshot)}</TableCell>
                <TableCell>{formatINR(m.cost_amount)}</TableCell>
                <TableCell>{qty(m.balance_after)}</TableCell>
                <TableCell>User #{m.recorded_by}</TableCell>
                <TableCell>{m.notes || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No movements match these filters.
          </p>
        )}
      </div>
    </Card>
  );
}
