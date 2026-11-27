"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

/* eslint-disable @next/next/no-img-element -- Demo category images may be data URLs. */
import { useState } from "react";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { DataTableCard } from "@/components/shared/data-table-card";
import { FormField } from "@/components/shared/form-field";
import type { Category, MenuItem } from "@/types/domain";
import { StatusBadge } from "@/components/shared/status-badge";
import { IconActionButton, Tooltip } from "@/components/ui/tooltip";
import { resolveAssetUrl } from "@/lib/format";

export function CategoriesTab({
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
  onEdit: (x: Category) => void;
  onToggle: (x: Category) => void;
  onImage: (x: Category) => void;
  onDelete?: (x: Category) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [failedImages, setFailedImages] = useState<Record<number, true>>({});

  const rows = categories
    .filter(
      (x) =>
        x.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (status === "ALL" || (status === "ACTIVE") === x.is_active),
    )
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );

  function renderCategoryThumb(x: Category, sizeClass: string) {
    if (x.image_path && !failedImages[x.id]) {
      return (
        <div
          className={`${sizeClass} shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted`}
        >
          <img
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            src={resolveAssetUrl(x.image_path, "/images/category.svg")}
            alt=""
            onError={() =>
              setFailedImages((prev) =>
                prev[x.id] ? prev : { ...prev, [x.id]: true },
              )
            }
          />
        </div>
      );
    }
    return (
      <div
        aria-hidden="true"
        className={`${sizeClass} grid shrink-0 place-items-center rounded-xl border border-dashed border-[#b99a46]/45 bg-[#f3ecda]/70 text-[#7c5c17] dark:bg-primary/20 dark:text-[#ebc96f]`}
      >
        <Layers size={18} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <DataTableCard
      title="Categories"
      count={categories.length}
      description="Organize dishes for the counter and customer QR menu."
      actions={
        admin && (
          <Button
            variant="default"
            className="min-h-11 sm:min-h-10"
            onClick={onAdd}
          >
            <Plus size={17} aria-hidden="true" /> Add category
          </Button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <FormField label="Search" htmlFor="category-filter-search" className="min-w-0">
          <Input
            id="category-filter-search"
            placeholder="Search categories"
            leadingIcon={<Search size={16} />}
            clearable
            clearLabel="Clear category search"
            onClear={() => setSearch("")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FormField>
        <FormField label="Status" htmlFor="category-filter-status" className="min-w-0">
          <NativeSelect
            id="category-filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </NativeSelect>
        </FormField>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((x) => {
          const dishCount = items.filter((i) => i.category_id === x.id).length;
          return (
            <article
              key={x.id}
              className="rounded-2xl border border-border bg-card p-3.5 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                {renderCategoryThumb(x, "size-16")}
                <div className="min-w-0 flex-1">
                  <strong className="block break-words text-sm leading-5">
                    {x.name}
                  </strong>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Sort order {x.sort_order} · {dishCount} dishes
                  </span>
                </div>
                <StatusBadge tone={x.is_active ? "success" : "neutral"}>
                  {x.is_active ? "Active" : "Archived"}
                </StatusBadge>
              </div>
              {admin && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <IconActionButton
                    icon={<Pencil size={15} />}
                    label={`Edit ${x.name}`}
                    tooltip="Edit category"
                    mobileLabel="Edit"
                    showLabelOnMobile
                    onClick={() => onEdit(x)}
                  />
                  <IconActionButton
                    icon={<ImagePlus size={15} />}
                    label={`Change image for ${x.name}`}
                    tooltip="Manage image"
                    mobileLabel="Photo"
                    showLabelOnMobile
                    onClick={() => onImage(x)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 gap-1.5 px-3 text-xs font-semibold"
                    onClick={() => onToggle(x)}
                    role="switch"
                    aria-checked={x.is_active}
                    aria-label={`Status for ${x.name}`}
                  >
                    {x.is_active ? (
                      <EyeOff size={15} aria-hidden="true" />
                    ) : (
                      <Eye size={15} aria-hidden="true" />
                    )}
                    <span>{x.is_active ? "Archive" : "Activate"}</span>
                  </Button>
                  {onDelete && (
                    <IconActionButton
                      icon={<Trash2 size={15} />}
                      label={`Delete ${x.name}`}
                      tooltip="Delete category"
                      mobileLabel="Delete"
                      tone="danger"
                      showLabelOnMobile
                      onClick={() => onDelete(x)}
                    />
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="w-full overflow-x-auto">
        <div className="hidden md:block">
          <Table className="w-full text-left text-sm tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Category name</TableHead>
                <TableHead>Sort order</TableHead>
                <TableHead>Dishes</TableHead>
                <TableHead>Status</TableHead>
                {admin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {renderCategoryThumb(x, "size-11")}
                      <strong>{x.name}</strong>
                    </div>
                  </TableCell>
                  <TableCell>{x.sort_order}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold tabular-nums">
                      {items.filter((i) => i.category_id === x.id).length}
                    </span>
                  </TableCell>
                  <TableCell>
                    {admin ? (
                      <Tooltip
                        content={
                          x.is_active
                            ? "Archive category"
                            : "Activate category"
                        }
                      >
                        <Button
                          variant="ghost"
                          role="switch"
                          aria-checked={x.is_active}
                          aria-label={`Status for ${x.name}`}
                          onClick={() => onToggle(x)}
                          className={`inline-flex min-h-10 items-center gap-2 text-xs font-semibold ${
                            x.is_active
                              ? "[&>span:first-child]:bg-primary [&>span:first-child>span]:translate-x-5"
                              : ""
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="relative h-6 w-11 rounded-full bg-muted-foreground/35 transition-colors"
                          >
                            <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform" />
                          </span>
                          <span>{x.is_active ? "Active" : "Archived"}</span>
                        </Button>
                      </Tooltip>
                    ) : (
                      <StatusBadge tone={x.is_active ? "success" : "neutral"}>
                        {x.is_active ? "Active" : "Archived"}
                      </StatusBadge>
                    )}
                  </TableCell>
                  {admin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <IconActionButton
                          icon={<Pencil size={15} />}
                          label={`Edit ${x.name}`}
                          tooltip="Edit category"
                          onClick={() => onEdit(x)}
                        />
                        <IconActionButton
                          icon={<ImagePlus size={15} />}
                          label={`Change image for ${x.name}`}
                          tooltip="Manage image"
                          onClick={() => onImage(x)}
                        />
                        {onDelete && (
                          <IconActionButton
                            icon={<Trash2 size={15} />}
                            label={`Delete ${x.name}`}
                            tooltip="Delete category"
                            tone="danger"
                            onClick={() => onDelete(x)}
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
            {categories.length
              ? "No categories match these filters."
              : "No categories yet. Add a category to organize your menu."}{" "}
            {categories.length > 0 && (
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setSearch("");
                  setStatus("ALL");
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
