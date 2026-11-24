"use client";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/shared/data-table-card";
import { FilterToolbar } from "@/components/shared/filter-toolbar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { InventoryItem } from "@/types/domain";
import { getStockStatus } from "@/lib/calculations";
import { StockBadge, qty, unitCost } from "./shared";
export function StockBalanceTable({
  items,
  admin,
  onLedger,
  onEdit,
  onAdjust,
}: {
  items: InventoryItem[];
  admin: boolean;
  onLedger: (id: number) => void;
  onEdit: (i: InventoryItem) => void;
  onAdjust: (i: InventoryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [archived, setArchived] = useState(false);
  const rows = items.filter(
    (i) =>
      (archived || i.is_active) &&
      `${i.name} ${i.sku ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()) &&
      (status === "ALL" ||
        getStockStatus(i.current_qty, i.min_limit_qty, i.critical_limit_qty) ===
          status),
  );
  return (
    <DataTableCard
      title="Current stock balance"
      description="Track quantities and reorder limits."
    >
      <div className="px-5 pt-4">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search stock"
        >
          <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground [&_input]:size-4 [&_input]:accent-blue-600">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />{" "}
            Show archived
          </label>
        </FilterToolbar>
      </div>
      <div
        className="flex gap-1 overflow-x-auto px-5 py-3"
        role="group"
        aria-label="Stock status filter"
      >
        {[
          ["ALL", "All"],
          ["HEALTHY", "Healthy"],
          ["LOW", "Low stock"],
          ["CRITICAL", "Critical"],
        ].map(([value, label]) => (
          <Button
            variant="outline"
            key={value}
            aria-pressed={status === value}
            className={status === value ? "bg-primary text-white" : ""}
            onClick={() => setStatus(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient / item</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Low / Critical limits</TableHead>
              <TableHead>Avg cost (INR)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <strong>{i.name}</strong>
                  <small>
                    {i.sku ?? "No SKU"}
                    {!i.is_active ? " - Archived" : ""}
                  </small>
                </TableCell>
                <TableCell>{i.unit}</TableCell>
                <TableCell>
                  <strong>{qty(i.current_qty)}</strong>
                </TableCell>
                <TableCell>
                  {qty(i.min_limit_qty)} / {qty(i.critical_limit_qty)}
                </TableCell>
                <TableCell>{unitCost(i.avg_unit_cost)}</TableCell>
                <TableCell>
                  <StockBadge item={i} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="size-11 p-0"
                        aria-label={`Actions for ${i.name}`}
                      >
                        <MoreHorizontal size={19} />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      className="w-48"
                      align="end"
                      sideOffset={4}
                    >
                      <DropdownMenuItem
                        className=""
                        onSelect={() => onLedger(i.id)}
                      >
                        View ledger
                      </DropdownMenuItem>
                      {admin && (
                        <>
                          <DropdownMenuItem
                            className=""
                            onSelect={() => onEdit(i)}
                          >
                            Edit item &amp; limits
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className=""
                            onSelect={() => onAdjust(i)}
                          >
                            Stock correction
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No stock items match these filters.{" "}
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setSearch("");
                setStatus("ALL");
                setArchived(false);
              }}
            >
              Reset filters
            </Button>
          </div>
        )}
      </div>
      <p className="px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        Daily stock usage is manual in Phase 1; billing does not auto-deduct raw
        ingredients. All movements are immutable and audited.
      </p>
    </DataTableCard>
  );
}
