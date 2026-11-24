"use client";
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
    <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Daily use &amp; waste</h2>
          <p>Recorded kitchen use and wastage.</p>
        </div>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 [&_label]:text-sm [&_label]:font-semibold [&_input]:mt-2 [&_select]:mt-2">
        <DateFilters from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <ItemSelect
          items={items}
          label="Ingredient"
          value={item}
          onChange={setItem}
          all
        />
      </div>
      <div className="w-full overflow-x-auto">
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
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No daily entries match these filters.
          </p>
        )}
      </div>
    </Card>
  );
}
