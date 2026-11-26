"use client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

/* eslint-disable @next/next/no-img-element -- Item images may be data URLs. */
import { useState } from "react";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DataTableCard } from "@/components/shared/data-table-card";
import { Eye, EyeOff, ImagePlus, Pencil, Plus } from "lucide-react";
import type { Category, MenuItem } from "@/types/domain";
import { formatINR, resolveAssetUrl } from "@/lib/format";

export function MenuItemsTab({
  categories,
  items,
  admin,
  onAdd,
  onEdit,
  onToggle,
  onImage,
}: {
  categories: Category[];
  items: MenuItem[];
  admin: boolean;
  onAdd: () => void;
  onEdit: (item: MenuItem) => void;
  onToggle: (item: MenuItem) => void;
  onImage: (item: MenuItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("ALL");
  const rows = items.filter(
    (item) =>
      `${item.name} ${item.sku ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()) &&
      (!category || item.category_id === Number(category)) &&
      (availability === "ALL" ||
        (availability === "AVAILABLE") === item.is_available),
  );
  const dietLabels = {
    VEG: "Veg",
    NON_VEG: "Non-Veg",
    EGG: "Egg",
    UNSPECIFIED: "Not classified",
  } as const;

  return (
    <DataTableCard
      title="Menu Manager"
      count={items.length}
      description="Manage dishes, pricing and availability for the counter menu."
      actions={
        admin && (
          <Button onClick={onAdd}>
            <Plus size={17} /> Add menu item
          </Button>
        )
      }
    >
      <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2 lg:grid-cols-3 [&_label]:text-sm [&_label]:font-semibold [&_input]:mt-2 [&_select]:mt-2">
        <label>
          Search
          <Input
            placeholder="Search name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Category
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Availability
          <Select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="AVAILABLE">Available</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </Select>
        </label>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-border bg-card p-3 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <img
                loading="lazy"
                decoding="async"
                className="size-16 shrink-0 rounded-xl bg-muted object-cover"
                src={resolveAssetUrl(item.image_path, "/images/dish.svg")}
                alt=""
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/dish.svg";
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start gap-1.5">
                  <span className="mt-1 shrink-0"><DietaryBadge type={item.dietary_type} /></span>
                  <strong className="min-w-0 break-words text-sm leading-5">{item.name}</strong>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {categories.find((c) => c.id === item.category_id)?.name ??
                    "Unknown"}{" "}
                  · {dietLabels[item.dietary_type] ?? "Not classified"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p>
              <strong>{formatINR(item.selling_price)}</strong>
              {item.has_half_portion && item.half_selling_price != null && (
                <span className="ml-3 text-muted-foreground">
                  Half: {formatINR(item.half_selling_price)}
                </span>
              )}
              </p>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_available ? "bg-primary/15 text-primary dark:bg-primary/25 dark:text-[#ebc96f]" : "bg-muted text-muted-foreground"}`}><span aria-hidden="true" className={`size-1.5 rounded-full ${item.is_available ? "bg-primary dark:bg-[#ebc96f]" : "bg-muted-foreground"}`} />{item.is_available ? "Available" : "Unavailable"}</span>
            </div>
            {admin && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  className="min-h-11 min-w-0 px-2"
                  onClick={() => onEdit(item)}
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil size={15} aria-hidden="true" /> Edit
                </Button>
                <Button variant="outline" className="min-h-11 min-w-0 px-2" onClick={() => onImage(item)} aria-label={`Change image for ${item.name}`}>
                  <ImagePlus size={16} aria-hidden="true" /> Photo
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11 min-w-0 px-2"
                  role="switch"
                  aria-checked={item.is_available}
                  aria-label={`Availability for ${item.name}`}
                  onClick={() => onToggle(item)}
                >
                  {item.is_available ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  {item.is_available ? "Hide" : "Show"}
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <div className="hidden md:block">
          <Table className="min-w-[730px] w-full text-left text-sm tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Dish</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Availability</TableHead>
                {admin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 [&_img]:size-11 [&_img]:rounded-xl [&_img]:object-cover">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={resolveAssetUrl(
                          item.image_path,
                          "/images/dish.svg",
                        )}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/dish.svg";
                        }}
                      />
                      <span className="min-w-0 [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <DietaryBadge type={item.dietary_type} />
                          <strong>{item.name}</strong>
                        </span>
                        <small>
                          {item.sku ??
                            dietLabels[item.dietary_type] ??
                            "Not classified"}
                        </small>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {categories.find((c) => c.id === item.category_id)?.name ??
                      "Unknown"}
                  </TableCell>
                  <TableCell>
                    <strong>{formatINR(item.selling_price)}</strong>
                    {item.has_half_portion &&
                      item.half_selling_price != null && (
                        <small>
                          Half: {formatINR(item.half_selling_price)}
                        </small>
                      )}
                  </TableCell>
                  <TableCell>
                    {admin ? (
                      <Button
                        variant="outline"
                        type="button"
                        className={`inline-flex min-h-11 items-center gap-2 text-sm ${item.is_available ? "[&>span:first-child]:bg-primary [&>span:first-child>span]:translate-x-5" : ""}`}
                        role="switch"
                        aria-checked={item.is_available}
                        aria-label={`Availability for ${item.name}`}
                        onClick={() => onToggle(item)}
                      >
                        <span className="relative inline-block h-7 w-12 rounded-full bg-muted-foreground/35 transition-colors [&>span]:absolute [&>span]:top-1 [&>span]:left-1 [&>span]:size-5 [&>span]:rounded-full [&>span]:bg-white [&>span]:transition-transform">
                          <span />
                        </span>
                        <span>
                          {item.is_available ? "Available" : "Unavailable"}
                        </span>
                      </Button>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {item.is_available ? "Available" : "Unavailable"}
                      </span>
                    )}
                  </TableCell>
                  {admin && (
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
                          <Pencil size={15} aria-hidden="true" /> Edit
                        </Button>
                        <Button variant="outline" onClick={() => onImage(item)} aria-label={`Change image for ${item.name}`}>
                          <ImagePlus size={16} aria-hidden="true" /> Photo
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!rows.length && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {items.length
              ? "No dishes match these filters."
              : "No dishes yet. Add a menu item to get started."}{" "}
            {items.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setAvailability("ALL");
                }}
              >
                Reset filters
              </Button>
            )}
          </div>
        )}
      </div>
    </DataTableCard>
  );
}
