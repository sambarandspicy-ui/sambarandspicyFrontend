"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    control,
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
  const unit = useWatch({ control, name: "unit" });

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {item ? "Edit item & limits" : "New stock item"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Set up the ingredient and its stock thresholds.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <DialogBody className="space-y-4">
            <FormField
              label="Name"
              htmlFor="inv-item-name"
              required
              error={errors.name?.message}
            >
              <Input
                id="inv-item-name"
                maxLength={150}
                error={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="SKU (Optional)" htmlFor="inv-item-sku">
                <Input id="inv-item-sku" {...register("sku")} maxLength={60} />
              </FormField>

              <FormField
                label="Unit"
                htmlFor="inv-item-unit"
                hint={
                  item && hasMovements
                    ? "Unit is fixed because this item has movements."
                    : undefined
                }
              >
                <NativeSelect
                  id="inv-item-unit"
                  {...register("unit")}
                  disabled={!!item && hasMovements}
                >
                  <option value="PACK">PACK</option>
                  <option value="KG">KG</option>
                  <option value="LITRE">LITRE</option>
                  <option value="PIECE">PIECE</option>
                </NativeSelect>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Low limit qty"
                htmlFor="inv-min-limit"
                error={errors.min_limit_qty?.message}
              >
                <Input
                  id="inv-min-limit"
                  type="number"
                  inputMode="decimal"
                  suffixText={unit}
                  min="0"
                  step="0.001"
                  error={Boolean(errors.min_limit_qty)}
                  {...register("min_limit_qty", { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="Critical limit qty"
                htmlFor="inv-critical-limit"
                error={errors.critical_limit_qty?.message}
              >
                <Input
                  id="inv-critical-limit"
                  type="number"
                  inputMode="decimal"
                  suffixText={unit}
                  min="0"
                  step="0.001"
                  error={Boolean(errors.critical_limit_qty)}
                  {...register("critical_limit_qty", { valueAsNumber: true })}
                />
              </FormField>
            </div>

            {!item && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  label="Opening balance"
                  htmlFor="inv-opening-balance"
                  error={errors.current_qty ? "Enter non-negative opening values." : undefined}
                >
                  <Input
                    id="inv-opening-balance"
                    type="number"
                    inputMode="decimal"
                    suffixText={unit}
                    min="0"
                    step="0.001"
                    error={Boolean(errors.current_qty)}
                    {...register("current_qty", { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  label="Initial unit cost (INR)"
                  htmlFor="inv-initial-cost"
                  error={errors.avg_unit_cost ? "Enter non-negative opening values." : undefined}
                >
                  <Input
                    id="inv-initial-cost"
                    type="number"
                    inputMode="decimal"
                    prefixText="₹"
                    min="0"
                    step="0.0001"
                    error={Boolean(errors.avg_unit_cost)}
                    {...register("avg_unit_cost", { valueAsNumber: true })}
                  />
                </FormField>
              </div>
            )}

            {item && (
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm font-medium text-foreground">
                <Input type="checkbox" {...register("is_active")} />
                <span>Active item</span>
              </label>
            )}

            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="default" type="submit" loading={pending}>
              {pending ? "Saving..." : "Save item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
