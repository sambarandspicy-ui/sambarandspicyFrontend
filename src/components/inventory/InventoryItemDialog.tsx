"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import type { InventoryItem } from "@/types/domain";
import type { InventoryInput } from "@/services/api/types";
const schema = z
  .object({
    name: z.string().trim().min(1, "Enter a name").max(150),
    sku: z.string().max(60),
    unit: z.enum(["PACK", "KG", "LITRE", "PIECE"]),
    min_limit_qty: z.number().finite().min(0),
    critical_limit_qty: z.number().finite().min(0),
    current_qty: z.number().finite().min(0),
    avg_unit_cost: z.number().finite().min(0),
    is_active: z.boolean(),
  })
  .refine((x) => x.critical_limit_qty <= x.min_limit_qty, {
    path: ["critical_limit_qty"],
    message: "Critical limit must not exceed the low limit.",
  });
type Values = z.infer<typeof schema>;
export function InventoryItemDialog({
  item,
  hasMovements,
  onClose,
  onSave,
  pending,
}: {
  item: InventoryItem | null;
  hasMovements: boolean;
  onClose: () => void;
  onSave: (input: InventoryInput) => Promise<void>;
  pending: boolean;
}) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name ?? "",
      sku: item?.sku ?? "",
      unit: item?.unit ?? "KG",
      min_limit_qty: item?.min_limit_qty ?? 0,
      critical_limit_qty: item?.critical_limit_qty ?? 0,
      current_qty: item?.current_qty ?? 0,
      avg_unit_cost: item?.avg_unit_cost ?? 0,
      is_active: item?.is_active ?? true,
    },
  });
  async function save(v: Values) {
    try {
      setError("");
      await onSave({ ...v, sku: v.sku.trim() || null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save item.");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !pending) onClose();
      }}
    >
      <DialogContent className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <DialogTitle>
              {item ? "Edit item & limits" : "New stock item"}
            </DialogTitle>
            <DialogDescription>
              Set up the ingredient and its stock thresholds.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="size-11 p-0"
              aria-label="Close item dialog"
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 pt-4 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label_input:not([type=checkbox])]:mt-2 [&_label_select]:mt-2 [&_label_textarea]:mt-2"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <label>
              Name
              <Input {...register("name")} maxLength={150} />
            </label>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            <label>
              SKU <span>Optional</span>
              <Input {...register("sku")} maxLength={60} />
            </label>
            <label>
              Unit
              <NativeSelect
                {...register("unit")}
                disabled={!!item && hasMovements}
              >
                <option value="PACK">PACK</option>
                <option value="KG">KG</option>
                <option value="LITRE">LITRE</option>
                <option value="PIECE">PIECE</option>
              </NativeSelect>
            </label>
            {item && hasMovements && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Unit is fixed because this item has movements.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Low limit qty
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  {...register("min_limit_qty", { valueAsNumber: true })}
                />
              </label>
              <label>
                Critical limit qty
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  {...register("critical_limit_qty", { valueAsNumber: true })}
                />
              </label>
            </div>
            {(errors.min_limit_qty || errors.critical_limit_qty) && (
              <p className="text-sm text-destructive" role="alert">
                {errors.critical_limit_qty?.message ??
                  errors.min_limit_qty?.message}
              </p>
            )}
            {!item && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  Opening balance
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    {...register("current_qty", { valueAsNumber: true })}
                  />
                </label>
                <label>
                  Initial unit cost (INR)
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    {...register("avg_unit_cost", { valueAsNumber: true })}
                  />
                </label>
              </div>
            )}
            {(errors.current_qty || errors.avg_unit_cost) && (
              <p className="text-sm text-destructive">
                Enter non-negative opening values.
              </p>
            )}
            {item && (
              <label className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground [&_input]:size-4 [&_input]:accent-blue-600">
                <input
                  className="size-4 accent-blue-600"
                  type="checkbox"
                  {...register("is_active")}
                />{" "}
                Active item
              </label>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              type="button"
              className="min-h-11"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              className="min-h-11"
              disabled={pending}
            >
              {pending ? "Saving..." : "Save item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
