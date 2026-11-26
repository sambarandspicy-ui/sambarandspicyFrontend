"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DataTableCard } from "@/components/shared/data-table-card";
import { FilterToolbar } from "@/components/shared/filter-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
      <div className="px-4 pt-4 sm:px-5">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search stock"
        >
          <label className="flex min-h-10 items-center gap-2 text-sm text-muted-foreground">
            <Input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            <span>Show archived</span>
          </label>
        </FilterToolbar>
      </div>

      <div
        className="pos-scroll no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-3 sm:px-5"
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
            variant={status === value ? "default" : "outline"}
            size="sm"
            className="shrink-0 rounded-full px-3.5"
            key={value}
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 p-4 pt-0 md:hidden">
        {rows.map((i) => (
          <Card key={i.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <strong className="block truncate text-sm font-bold text-foreground">
                  {i.name}
                </strong>
                <small className="text-xs text-muted-foreground">
                  {i.sku ?? "No SKU"} · {i.unit}
                  {!i.is_active ? " · Archived" : ""}
                </small>
              </div>
              <StockBadge item={i} />
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-2.5 text-xs tabular-nums">
              <div>
                <span className="block text-muted-foreground">Balance</span>
                <strong className="text-sm font-bold text-foreground">
                  {qty(i.current_qty)}
                </strong>
              </div>
              <div>
                <span className="block text-muted-foreground">Low / Crit</span>
                <strong className="font-semibold">
                  {qty(i.min_limit_qty)} / {qty(i.critical_limit_qty)}
                </strong>
              </div>
              <div>
                <span className="block text-muted-foreground">Avg cost</span>
                <strong className="font-semibold">{unitCost(i.avg_unit_cost)}</strong>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onLedger(i.id)}>
                View ledger
              </Button>
              {admin && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onEdit(i)}>
                    Edit item &amp; limits
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onAdjust(i)}>
                    Stock correction
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-x-auto md:block">
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
                  <strong className="block">{i.name}</strong>
                  <small className="text-xs text-muted-foreground">
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
                        size="icon"
                        aria-label={`Actions for ${i.name}`}
                      >
                        <MoreHorizontal size={19} aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-48" align="end" sideOffset={4}>
                      <DropdownMenuItem onSelect={() => onLedger(i.id)}>
                        View ledger
                      </DropdownMenuItem>
                      {admin && (
                        <>
                          <DropdownMenuItem onSelect={() => onEdit(i)}>
                            Edit item &amp; limits
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onAdjust(i)}>
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
      </div>

      {rows.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No stock items match these filters.{" "}
          <Button
            variant="outline"
            size="sm"
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

      <p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground sm:px-5">
        Daily stock usage is manual in Phase 1; billing does not auto-deduct raw
        ingredients. All movements are immutable and audited.
      </p>
    </DataTableCard>
  );
}
