"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryItem, StockDailyEntry } from "@/types/domain";
import { DateFilters, ItemSelect, dateTime, inDates, qty } from "./shared";

export function DailyEntriesTab({
  entries,
  items,
}: {
  entries: StockDailyEntry[];
  items: InventoryItem[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [item, setItem] = useState("");

  const rows = entries
    .filter(
      (x) =>
        inDates(x.business_date, from, to) &&
        (!item || x.inventory_item_id === Number(item)),
    )
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at));

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2>Daily use &amp; waste</h2>
        <p>Recorded kitchen use and wastage.</p>
      </div>
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_select]:mt-2">
        <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <ItemSelect
          items={items}
          label="Ingredient"
          value={item}
          onChange={setItem}
          all
        />
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((x) => {
          const itemObj = items.find((i) => i.id === x.inventory_item_id);
          return (
            <div
              key={x.id}
              className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <strong className="truncate">
                  {itemObj?.name ?? `Item #${x.inventory_item_id}`}
                </strong>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {x.business_date}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-card p-2.5 text-xs tabular-nums">
                <div>
                  <span className="block text-muted-foreground">Used</span>
                  <strong className="text-sm">
                    {qty(x.used_qty)} {itemObj?.unit ?? ""}
                  </strong>
                </div>
                <div>
                  <span className="block text-muted-foreground">Wasted</span>
                  <strong className="text-sm text-destructive">
                    {qty(x.wasted_qty)} {itemObj?.unit ?? ""}
                  </strong>
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
                <span>User #{x.created_by}</span>
                <span>{dateTime(x.posted_at)}</span>
              </div>
              {x.notes && <p className="text-xs text-muted-foreground">Note: {x.notes}</p>}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Business date</TableHead>
              <TableHead>Ingredient</TableHead>
              <TableHead>Used qty</TableHead>
              <TableHead>Wasted qty</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Recorded by</TableHead>
              <TableHead>Posted at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((x) => (
              <TableRow key={x.id}>
                <TableCell>{x.business_date}</TableCell>
                <TableCell>
                  {items.find((i) => i.id === x.inventory_item_id)?.name ??
                    `Item #${x.inventory_item_id}`}
                </TableCell>
                <TableCell>{qty(x.used_qty)}</TableCell>
                <TableCell>{qty(x.wasted_qty)}</TableCell>
                <TableCell>{x.notes || "-"}</TableCell>
                <TableCell>User #{x.created_by}</TableCell>
                <TableCell>{dateTime(x.posted_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rows.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No daily entries match these filters.
        </p>
      )}
    </Card>
  );
}
