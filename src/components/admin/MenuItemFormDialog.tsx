"use client";
import { Card } from "@/components/ui/card";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Image as ImageIcon, Tag, UtensilsCrossed } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import type { Category, MenuItem } from "@/types/domain";
import type { MenuItemInput } from "@/services/api/types";
import { ImagePicker, validateUploadImageFile } from "./ImagePicker";
const schema = z
  .object({
    category_id: z.string().min(1, "Choose a category"),
    dietary_type: z.enum(["UNSPECIFIED", "VEG", "NON_VEG", "EGG"]),
    name: z.string().trim().min(1, "Enter a dish name").max(150),
    sku: z.string().max(50),
    description: z.string().max(300),
    selling_price: z
      .number()
      .finite()
      .min(0, "Selling price must be non-negative"),
    has_half_portion: z.boolean(),
    half_selling_price: z.string().optional(),
    estimated_unit_cost: z
      .string()
      .refine(
        (v) =>
          v.trim() === "" ||
          (/^\d+(\.\d{1,2})?$/.test(v) && Number.isFinite(Number(v))),
        "Enter a valid non-negative cost with up to 2 decimals",
      ),
    half_estimated_unit_cost: z
      .string()
      .optional()
      .refine(
        (v) =>
          !v ||
          v.trim() === "" ||
          (/^\d+(\.\d{1,2})?$/.test(v) && Number.isFinite(Number(v))),
        "Enter a valid non-negative cost with up to 2 decimals",
      ),
    sort_order: z.number().int(),
    is_available: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.has_half_portion) {
        return (
          !!data.half_selling_price &&
          data.half_selling_price.trim() !== "" &&
          /^\d+(\.\d{1,2})?$/.test(data.half_selling_price)
        );
      }
      return true;
    },
    {
      message:
        "Half plate selling price is required when half portion is enabled.",
      path: ["half_selling_price"],
    },
  );
type Values = z.infer<typeof schema>;
export function MenuItemFormDialog({
  item,
  categories,
  items,
  onClose,
  onSave,
  pending,
}: {
  item: MenuItem | null;
  categories: Category[];
  items: MenuItem[];
  onClose: () => void;
  onSave: (v: MenuItemInput, file?: File | null) => Promise<void>;
  pending: boolean;
}) {
  const [image, setImage] = useState(item?.image_path ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    setError: fieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      category_id: item ? String(item.category_id) : "",
      dietary_type: item?.dietary_type ?? "UNSPECIFIED",
      name: item?.name ?? "",
      sku: item?.sku ?? "",
      description: item?.description ?? "",
      selling_price: item?.selling_price ?? 0,
      has_half_portion: item?.has_half_portion ?? false,
      half_selling_price:
        item?.half_selling_price != null ? String(item.half_selling_price) : "",
      estimated_unit_cost: item?.estimated_unit_cost?.toString() ?? "",
      half_estimated_unit_cost:
        item?.half_estimated_unit_cost != null
          ? String(item.half_estimated_unit_cost)
          : "",
      sort_order: item?.sort_order ?? 0,
      is_available: item?.is_available ?? true,
    },
  });
  const hasHalf = useWatch({ control, name: "has_half_portion" });
  async function save(v: Values) {
    const sku = v.sku.trim();
    if (
      sku &&
      items.some(
        (x) => x.id !== item?.id && x.sku?.toLowerCase() === sku.toLowerCase(),
      )
    ) {
      fieldError("sku", { message: "SKU already exists." });
      return;
    }
    if (
      items.some(
        (x) =>
          x.id !== item?.id &&
          x.category_id === Number(v.category_id) &&
          x.name.trim().toLowerCase() === v.name.toLowerCase(),
      )
    ) {
      fieldError("name", {
        message: "A dish with this name already exists in the category.",
      });
      return;
    }
    try {
      setError("");
      if (selectedFile) {
        const fileIssue = validateUploadImageFile(selectedFile);
        if (fileIssue) {
          setError(fileIssue);
          return;
        }
      }
      const halfPrice =
        v.has_half_portion && v.half_selling_price?.trim()
          ? Number(v.half_selling_price)
          : null;
      const halfCost =
        v.has_half_portion && v.half_estimated_unit_cost?.trim()
          ? Number(v.half_estimated_unit_cost)
          : null;
      const imagePathToSend = selectedFile ? (item?.image_path ?? null) : image;
      await onSave(
        {
          category_id: Number(v.category_id),
          dietary_type: v.dietary_type,
          name: v.name,
          sku: sku || null,
          description: v.description.trim() || null,
          selling_price: v.selling_price,
          has_half_portion: v.has_half_portion,
          half_selling_price: halfPrice,
          estimated_unit_cost: v.estimated_unit_cost.trim()
            ? Number(v.estimated_unit_cost)
            : null,
          half_estimated_unit_cost: halfCost,
          sort_order: v.sort_order,
          is_available: v.is_available,
          image_path: imagePathToSend,
        },
        selectedFile,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save dish.");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !pending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <span className="text-xs font-semibold tracking-widest text-primary">
            MENU MANAGEMENT
          </span>
          <DialogTitle>
            {item ? "Edit menu item" : "Add menu item"}
          </DialogTitle>
          <DialogDescription>
            Set up the details your counter staff will see.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <DialogBody className="space-y-4">
            <Card className="space-y-4 bg-muted/30 p-4 sm:p-5">
              <div className="[&_h3]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
                <h3 className="flex items-center gap-2"><UtensilsCrossed size={17} className="text-primary" aria-hidden="true" /> Dish details</h3>
                <p>Tell your team what is on the menu.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="menu-category" className="block text-sm font-semibold">Category</label>
                  <Controller control={control} name="category_id" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="menu-category" ref={field.ref} onBlur={field.onBlur} aria-invalid={!!errors.category_id} aria-describedby={errors.category_id ? "menu-category-error" : undefined} className="mt-2 min-h-11 text-base sm:text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)]" sideOffset={6} collisionPadding={12}>
                        {categories.map((c) => <SelectItem key={c.id} value={String(c.id)} className="min-h-11">{c.name}{c.is_active ? "" : " (archived)"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                  {errors.category_id && <p id="menu-category-error" role="alert" className="mt-1 text-sm text-destructive">{errors.category_id.message}</p>}
                </div>
                <div>
                  <label htmlFor="menu-dietary-type" className="block text-sm font-semibold">Dietary type</label>
                  <Controller control={control} name="dietary_type" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="menu-dietary-type" ref={field.ref} onBlur={field.onBlur} className="mt-2 min-h-11 text-base sm:text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)]" sideOffset={6} collisionPadding={12}>
                        <SelectItem value="UNSPECIFIED" className="min-h-11">Not classified</SelectItem>
                        <SelectItem value="VEG" className="min-h-11">Veg</SelectItem>
                        <SelectItem value="NON_VEG" className="min-h-11">Non-Veg</SelectItem>
                        <SelectItem value="EGG" className="min-h-11">Egg</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <FormField label="Dish name" htmlFor="menu-dish-name" error={errors.name?.message} required>
                  <Input
                    id="menu-dish-name"
                    maxLength={150}
                    placeholder="e.g. Masala dosa"
                    error={!!errors.name}
                    {...register("name")}
                  />
                </FormField>
                <FormField label="SKU (Optional)" htmlFor="menu-dish-sku" error={errors.sku?.message}>
                  <Input
                    id="menu-dish-sku"
                    maxLength={50}
                    placeholder="e.g. DOSA-01"
                    error={!!errors.sku}
                    {...register("sku")}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Description (Optional)" htmlFor="menu-dish-desc">
                    <Textarea
                      id="menu-dish-desc"
                      maxLength={300}
                      placeholder="Add a short description of this dish"
                      {...register("description")}
                    />
                  </FormField>
                </div>
              </div>
            </Card>
            <Card className="space-y-4 bg-muted/30 p-4 sm:p-5">
              <div className="[&_h3]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
                <h3 className="flex items-center gap-2"><Tag size={17} className="text-primary" aria-hidden="true" /> Pricing &amp; portions</h3>
                <p>Set the selling price and optional estimated cost.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Selling price (INR)" htmlFor="menu-selling-price" error={errors.selling_price ? "Enter a valid non-negative price." : undefined} required>
                  <Input
                    id="menu-selling-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    prefixText="₹"
                    error={!!errors.selling_price}
                    {...register("selling_price", { valueAsNumber: true })}
                  />
                </FormField>
                <FormField label="Est. unit cost (INR)" htmlFor="menu-unit-cost" error={errors.estimated_unit_cost?.message}>
                  <Input
                    id="menu-unit-cost"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    prefixText="₹"
                    error={!!errors.estimated_unit_cost}
                    {...register("estimated_unit_cost")}
                  />
                </FormField>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted p-3 text-sm font-semibold [&_input]:size-4 [&_input]:accent-primary">
                <Input type="checkbox" {...register("has_half_portion")} />{" "}
                Enable half plate portion
              </label>
              {hasHalf && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Half plate price (INR)" htmlFor="menu-half-price" error={errors.half_selling_price?.message} required>
                    <Input
                      id="menu-half-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      prefixText="₹"
                      error={!!errors.half_selling_price}
                      {...register("half_selling_price")}
                    />
                  </FormField>
                  <FormField label="Half plate est. cost (INR)" htmlFor="menu-half-cost" error={errors.half_estimated_unit_cost?.message}>
                    <Input
                      id="menu-half-cost"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      prefixText="₹"
                      error={!!errors.half_estimated_unit_cost}
                      {...register("half_estimated_unit_cost")}
                    />
                  </FormField>
                </div>
              )}
            </Card>
            <Card className="space-y-4 bg-muted/30 p-4 sm:p-5">
              <div className="[&_h3]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
                <h3 className="flex items-center gap-2"><ImageIcon size={17} className="text-primary" aria-hidden="true" /> Image &amp; availability</h3>
                <p>Choose how this dish appears at the counter.</p>
              </div>
              <FormField label="Sort order" htmlFor="menu-sort-order" error={errors.sort_order ? "Enter an integer sort order." : undefined}>
                <Input
                  id="menu-sort-order"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  error={!!errors.sort_order}
                  {...register("sort_order", { valueAsNumber: true })}
                />
              </FormField>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted p-3 text-sm font-semibold [&_input]:size-4 [&_input]:accent-primary">
                <Input type="checkbox" {...register("is_available")} />{" "}
                Available in billing menu
              </label>
              <ImagePicker
                label="Dish image"
                value={image}
                onChange={setImage}
                onFileSelect={setSelectedFile}
                onProcessingChange={setImageProcessing}
              />
            </Card>
            {error && (
              <Alert variant="destructive" role="alert" className="py-3">
                {error}
              </Alert>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              className="min-h-11 sm:min-h-10"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-11 sm:min-h-10" loading={pending} disabled={imageProcessing}>
              {pending ? "Saving..." : "Save dish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
