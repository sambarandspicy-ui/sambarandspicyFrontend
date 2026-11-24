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
import { DataTableCard } from "@/components/shared/data-table-card";
import type { Category, MenuItem } from "@/types/domain";
import { StatusBadge } from "@/components/shared/status-badge";
import { resolveAssetUrl } from "@/lib/format";
import { Eye, EyeOff, ImagePlus, Pencil, Plus } from "lucide-react";
export function CategoriesTab({
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
  onEdit: (x: Category) => void;
  onToggle: (x: Category) => void;
  onImage: (x: Category) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const rows = categories
    .filter(
      (x) =>
        x.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        (status === "ALL" || (status === "ACTIVE") === x.is_active),
    )
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
  return (
    <DataTableCard
      title="Categories"
      count={categories.length}
      description="Organize dishes for the counter menu."
      actions={
        admin && (
          <Button variant="default" className="min-h-11" onClick={onAdd}>
            <Plus size={17} aria-hidden="true" /> Add category
          </Button>
        )
      }
    >
      <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2 lg:grid-cols-3 [&_label]:text-sm [&_label]:font-semibold [&_input]:mt-2 [&_select]:mt-2">
        <label>
          Search
          <Input
            placeholder="Search categories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Status
          <NativeSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </NativeSelect>
        </label>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((x) => (
          <article
            key={x.id}
            className="rounded-2xl border border-border bg-card p-3 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <img
                loading="lazy"
                decoding="async"
                className="size-16 shrink-0 rounded-xl bg-muted object-cover"
                src={resolveAssetUrl(x.image_path, "/images/category.svg")}
                alt=""
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/category.svg";
                }}
              />
              <div className="min-w-0 flex-1">
                <strong className="block break-words text-sm leading-5">
                  {x.name}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Sort order {x.sort_order} ·{" "}
                  {items.filter((i) => i.category_id === x.id).length} dishes
                </span>
              </div>
            </div>
            <div className="mt-3">
              <StatusBadge tone={x.is_active ? "success" : "neutral"}>
                {x.is_active ? "Active" : "Archived"}
              </StatusBadge>
            </div>
            {admin && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  className="min-h-11 min-w-0 gap-1 px-1 text-xs min-[360px]:text-sm"
                  onClick={() => onEdit(x)}
                  aria-label={`Edit ${x.name}`}
                >
                  <Pencil size={15} aria-hidden="true" className="hidden shrink-0 min-[360px]:block" /> Edit
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11 min-w-0 gap-1 px-1 text-xs min-[360px]:text-sm"
                  onClick={() => onImage(x)}
                  aria-label={`Change image for ${x.name}`}
                >
                  <ImagePlus size={16} aria-hidden="true" className="hidden shrink-0 min-[360px]:block" /> Photo
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11 min-w-0 gap-1 px-1 text-xs min-[360px]:text-sm"
                  onClick={() => onToggle(x)}
                  role="switch"
                  aria-checked={x.is_active}
                  aria-label={`Status for ${x.name}`}
                >
                  {x.is_active ? (
                    <EyeOff size={15} aria-hidden="true" className="hidden shrink-0 min-[360px]:block" />
                  ) : (
                    <Eye size={15} aria-hidden="true" className="hidden shrink-0 min-[360px]:block" />
                  )}
                  {x.is_active ? "Archive" : "Activate"}
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="w-full">
        <div className="hidden md:block">
          <Table className="w-full text-left text-sm tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead>Category name</TableHead>
                <TableHead>Sort order</TableHead>
                <TableHead>Dishes</TableHead>
                <TableHead>Status</TableHead>
                {admin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 [&_img]:size-11 [&_img]:rounded-xl [&_img]:object-cover">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={resolveAssetUrl(
                          x.image_path,
                          "/images/category.svg",
                        )}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/category.svg";
                        }}
                      />
                      <strong>{x.name}</strong>
                    </div>
                  </TableCell>
                  <TableCell>{x.sort_order}</TableCell>
                  <TableCell>
                    {items.filter((i) => i.category_id === x.id).length}
                  </TableCell>
                  <TableCell>
                    {admin ? (
                      <Button
                        variant="ghost"
                        role="switch"
                        aria-checked={x.is_active}
                        aria-label={`Status for ${x.name}`}
                        onClick={() => onToggle(x)}
                        className={`inline-flex min-h-11 items-center gap-2 text-sm ${x.is_active ? "[&>span:first-child]:bg-green-600 [&>span:first-child>span]:translate-x-5" : ""}`}
                      >
                        <span
                          aria-hidden="true"
                          className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors"
                        >
                          <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform" />
                        </span>
                        <span>{x.is_active ? "Active" : "Archived"}</span>
                      </Button>
                    ) : (
                      <StatusBadge tone={x.is_active ? "success" : "neutral"}>
                        {x.is_active ? "Active" : "Archived"}
                      </StatusBadge>
                    )}
                  </TableCell>
                  {admin && (
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="min-h-11"
                          onClick={() => onEdit(x)}
                          aria-label={`Edit ${x.name}`}
                        >
                          <Pencil size={15} aria-hidden="true" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-11"
                          onClick={() => onImage(x)}
                          aria-label={`Change image for ${x.name}`}
                        >
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
