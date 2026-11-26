"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2>Stock history</h2>
        <p>Immutable stock movements and cost snapshots.</p>
      </div>
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_select]:mt-2">
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

      {/* Mobile card list */}
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((m) => (
          <div
            key={m.id}
            className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <strong className="block truncate">
                  {items.find((i) => i.id === m.inventory_item_id)?.name ??
                    `Item #${m.inventory_item_id}`}
                </strong>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {m.business_date} · {dateTime(m.recorded_at)}
                </span>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {m.movement_type.replaceAll("_", " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-card p-2.5 text-xs tabular-nums">
              <div>
                <span className="block text-muted-foreground">Delta</span>
                <strong
                  className={
                    m.quantity_delta >= 0 ? "text-success" : "text-destructive"
                  }
                >
                  {m.quantity_delta > 0 ? "+" : ""}
                  {qty(m.quantity_delta)}
                </strong>
              </div>
              <div>
                <span className="block text-muted-foreground">Balance</span>
                <strong>{qty(m.balance_after)}</strong>
              </div>
              <div>
                <span className="block text-muted-foreground">Value</span>
                <strong>{formatINR(m.cost_amount)}</strong>
              </div>
            </div>
            {m.notes && (
              <p className="text-xs text-muted-foreground">Note: {m.notes}</p>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
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
                  <small className="block text-xs text-muted-foreground">
                    Posted {dateTime(m.recorded_at)}
                  </small>
                </TableCell>
                <TableCell>
                  {items.find((i) => i.id === m.inventory_item_id)?.name ??
                    `Item #${m.inventory_item_id}`}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {m.movement_type.replaceAll("_", " ")}
                  </Badge>
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
      </div>

      {rows.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No movements match these filters.
        </p>
      )}
    </Card>
  );
}
