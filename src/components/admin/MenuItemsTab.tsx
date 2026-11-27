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
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ImageOff,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { DishFallbackArt } from "@/components/public-menu/DishArt";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { DataTableCard } from "@/components/shared/data-table-card";
import { FormField } from "@/components/shared/form-field";
import { StatCard } from "@/components/shared/stat-card";
import { IconActionButton, Tooltip } from "@/components/ui/tooltip";
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
  onDelete,
}: {
  categories: Category[];
  items: MenuItem[];
  admin: boolean;
  onAdd: () => void;
  onEdit: (item: MenuItem) => void;
  onToggle: (item: MenuItem) => void;
  onImage: (item: MenuItem) => void;
  onDelete?: (item: MenuItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState("ALL");
  const [failedImages, setFailedImages] = useState<Record<number, true>>({});

  const rows = items.filter((item) => {
    const matchesSearch = `${item.name} ${item.sku ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim());
    const matchesCategory = !category || item.category_id === Number(category);
    const matchesAvailability =
      availability === "ALL" ||
      (availability === "MISSING_PHOTO"
        ? !item.image_path
        : (availability === "AVAILABLE") === item.is_available);
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const availableCount = items.filter((i) => i.is_available).length;
  const unavailableCount = items.length - availableCount;
  const missingPhotosCount = items.filter((i) => !i.image_path).length;

  const dietLabels = {
    VEG: "Veg",
    NON_VEG: "Non-Veg",
    EGG: "Egg",
    UNSPECIFIED: "Not classified",
  } as const;

  function renderThumbnail(item: MenuItem, sizeClass: string, compactFallback = true) {
    const categoryName = categories.find((c) => c.id === item.category_id)?.name;
    if (item.image_path && !failedImages[item.id]) {
      return (
        <div
          className={`${sizeClass} shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted`}
        >
          <img
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            src={resolveAssetUrl(item.image_path, "/images/dish.svg")}
            alt=""
            onError={() =>
              setFailedImages((prev) =>
                prev[item.id] ? prev : { ...prev, [item.id]: true },
              )
            }
          />
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-xl border border-border/60`}
      >
        <DishFallbackArt
          name={item.name}
          categoryName={categoryName}
          dietaryType={item.dietary_type}
          compact={compactFallback}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total dishes"
          value={items.length}
          tone="brand"
          icon={<UtensilsCrossed size={18} aria-hidden="true" />}
        />
        <StatCard
          label="Available"
          value={availableCount}
          tone="success"
          icon={<CheckCircle2 size={18} aria-hidden="true" />}
        />
        <StatCard
          label="Unavailable"
          value={unavailableCount}
          tone={unavailableCount > 0 ? "warning" : "default"}
          icon={<EyeOff size={18} aria-hidden="true" />}
        />
        <StatCard
          label="Missing photos"
          value={missingPhotosCount}
          tone={missingPhotosCount > 0 ? "warning" : "default"}
          icon={<ImageOff size={18} aria-hidden="true" />}
        />
      </div>

      <DataTableCard
        title="Menu Manager"
        count={rows.length === items.length ? items.length : rows.length}
        description="Manage dishes, pricing, photos and availability for the counter menu."
        actions={
          admin && (
            <Button onClick={onAdd} className="min-h-11 sm:min-h-10">
              <Plus size={17} aria-hidden="true" /> Add menu item
            </Button>
          )
        }
      >
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
          <FormField label="Search" htmlFor="menu-filter-search" className="min-w-0">
            <Input
              id="menu-filter-search"
              placeholder="Search name or SKU"
              leadingIcon={<Search size={16} />}
              clearable
              clearLabel="Clear menu search"
              onClear={() => setSearch("")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>
          <FormField label="Category" htmlFor="menu-filter-category" className="min-w-0">
            <Select
              id="menu-filter-category"
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
          </FormField>
          <FormField label="Availability" htmlFor="menu-filter-availability" className="min-w-0">
            <Select
              id="menu-filter-availability"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
              <option value="MISSING_PHOTO">Missing photo</option>
            </Select>
          </FormField>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-3 p-4 md:hidden">
          {rows.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                {renderThumbnail(item, "size-16")}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start gap-1.5">
                    <span className="mt-1 shrink-0">
                      <DietaryBadge type={item.dietary_type} />
                    </span>
                    <strong className="min-w-0 break-words text-sm leading-5">
                      {item.name}
                    </strong>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {categories.find((c) => c.id === item.category_id)?.name ??
                      "Unknown"}{" "}
                    · {dietLabels[item.dietary_type] ?? "Not classified"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm tabular-nums">
                <p>
                  <strong className="text-primary dark:text-[#ebc96f]">
                    {formatINR(item.selling_price)}
                  </strong>
                  {item.has_half_portion && item.half_selling_price != null && (
                    <span className="ml-2.5 text-xs text-muted-foreground">
                      Half: {formatINR(item.half_selling_price)}
                    </span>
                  )}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    item.is_available
                      ? "bg-primary/15 text-primary dark:bg-primary/25 dark:text-[#ebc96f]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${
                      item.is_available
                        ? "bg-primary dark:bg-[#ebc96f]"
                        : "bg-muted-foreground"
                    }`}
                  />
                  {item.is_available ? "Available" : "Unavailable"}
                </span>
              </div>
              {admin && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <IconActionButton
                    icon={<Pencil size={15} />}
                    label={`Edit ${item.name}`}
                    tooltip="Edit dish"
                    mobileLabel="Edit"
                    showLabelOnMobile
                    onClick={() => onEdit(item)}
                  />
                  <IconActionButton
                    icon={<ImagePlus size={15} />}
                    label={`Change image for ${item.name}`}
                    tooltip="Manage image"
                    mobileLabel="Photo"
                    showLabelOnMobile
                    onClick={() => onImage(item)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 gap-1.5 px-3 text-xs font-semibold"
                    role="switch"
                    aria-checked={item.is_available}
                    aria-label={`Availability for ${item.name}`}
                    onClick={() => onToggle(item)}
                  >
                    {item.is_available ? (
                      <EyeOff size={15} aria-hidden="true" />
                    ) : (
                      <Eye size={15} aria-hidden="true" />
                    )}
                    <span>{item.is_available ? "Hide" : "Show"}</span>
                  </Button>
                  {onDelete && (
                    <IconActionButton
                      icon={<Trash2 size={15} />}
                      label={`Delete ${item.name}`}
                      tooltip="Delete dish"
                      mobileLabel="Delete"
                      tone="danger"
                      showLabelOnMobile
                      onClick={() => onDelete(item)}
                    />
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="w-full overflow-x-auto">
          <div className="hidden md:block">
            <Table className="min-w-[740px] w-full text-left text-sm tabular-nums">
              <TableHeader>
                <TableRow>
                  <TableHead>Dish</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Availability</TableHead>
                  {admin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {renderThumbnail(item, "size-11")}
                        <span className="min-w-0 [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <DietaryBadge type={item.dietary_type} />
                            <strong className="truncate">{item.name}</strong>
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
                      <span className="inline-flex rounded-lg bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground">
                        {categories.find((c) => c.id === item.category_id)?.name ??
                          "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <strong className="text-primary dark:text-[#ebc96f]">
                        {formatINR(item.selling_price)}
                      </strong>
                      {item.has_half_portion &&
                        item.half_selling_price != null && (
                          <small className="block text-xs text-muted-foreground">
                            Half: {formatINR(item.half_selling_price)}
                          </small>
                        )}
                    </TableCell>
                    <TableCell>
                      {admin ? (
                        <Tooltip
                          content={
                            item.is_available
                              ? "Mark unavailable"
                              : "Mark available"
                          }
                        >
                          <Button
                            variant="outline"
                            type="button"
                            className={`inline-flex min-h-10 items-center gap-2 text-xs font-semibold ${
                              item.is_available
                                ? "[&>span:first-child]:bg-primary [&>span:first-child>span]:translate-x-5"
                                : ""
                            }`}
                            role="switch"
                            aria-checked={item.is_available}
                            aria-label={`Availability for ${item.name}`}
                            onClick={() => onToggle(item)}
                          >
                            <span className="relative inline-block h-6 w-11 rounded-full bg-muted-foreground/35 transition-colors [&>span]:absolute [&>span]:top-0.5 [&>span]:left-0.5 [&>span]:size-5 [&>span]:rounded-full [&>span]:bg-white [&>span]:transition-transform">
                              <span />
                            </span>
                            <span>
                              {item.is_available ? "Available" : "Unavailable"}
                            </span>
                          </Button>
                        </Tooltip>
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {item.is_available ? "Available" : "Unavailable"}
                        </span>
                      )}
                    </TableCell>
                    {admin && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <IconActionButton
                            icon={<Pencil size={15} />}
                            label={`Edit ${item.name}`}
                            tooltip="Edit dish"
                            onClick={() => onEdit(item)}
                          />
                          <IconActionButton
                            icon={<ImagePlus size={15} />}
                            label={`Change image for ${item.name}`}
                            tooltip="Manage image"
                            onClick={() => onImage(item)}
                          />
                          {onDelete && (
                            <IconActionButton
                              icon={<Trash2 size={15} />}
                              label={`Delete ${item.name}`}
                              tooltip="Delete dish"
                              tone="danger"
                              onClick={() => onDelete(item)}
                            />
                          )}
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
    </div>
  );
}
