"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2 } from "lucide-react";
import type { InventoryItem } from "@/types/domain";
import type { PurchaseInput } from "@/services/api/types";
import { formatINR, getBusinessDateIST } from "@/lib/format";
import { round } from "@/lib/calculations";
const schema = z.object({
  business_date: z.string().min(1, "Select a date"),
  supplier_name: z.string().max(150),
  purchase_reference: z.string().max(100),
  notes: z.string().max(255),
  lines: z
    .array(
      z.object({
        inventory_item_id: z.string().min(1, "Select an item"),
        quantity: z
          .number()
          .finite()
          .positive("Quantity must be greater than zero"),
        unit_cost: z.number().finite().min(0, "Cost cannot be negative"),
      }),
    )
    .min(1),
});
type Values = z.infer<typeof schema>;
export function AddPurchaseDrawer({
  items,
  onClose,
  onSave,
  pending,
}: {
  items: InventoryItem[];
  onClose: () => void;
  onSave: (v: PurchaseInput) => Promise<void>;
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
      business_date: getBusinessDateIST(),
      supplier_name: "",
      purchase_reference: "",
      notes: "",
      lines: [{ inventory_item_id: "", quantity: 1, unit_cost: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const lines = useWatch({ control, name: "lines" }) ?? [];
  const lineTotal = (quantity: number, cost: number) =>
    Number.isFinite(quantity) && Number.isFinite(cost)
      ? round(quantity * cost, 2)
      : 0;
  const total =
    lines.reduce(
      (n, l) => n + Math.round(lineTotal(l.quantity, l.unit_cost) * 100),
      0,
    ) / 100;
  async function save(v: Values) {
    try {
      setError("");
      await onSave({
        business_date: v.business_date,
        supplier_name: v.supplier_name.trim() || null,
        purchase_reference: v.purchase_reference.trim() || null,
        notes: v.notes.trim() || null,
        lines: v.lines.map((l) => ({
          ...l,
          inventory_item_id: Number(l.inventory_item_id),
        })),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save purchase.");
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v && !pending) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-5 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <SheetTitle>Add buying stock</SheetTitle>
            <SheetDescription>
              Record a supplier purchase and update stock balances.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              className="size-11 p-0"
              aria-label="Close purchase drawer"
            >
              <X size={19} />
            </Button>
          </SheetClose>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_input]:mt-2 [&_select]:mt-2">
            <label>
              Business date
              <Input type="date" {...register("business_date")} />
            </label>
            {errors.business_date && (
              <p className="text-sm text-destructive">
                {errors.business_date.message}
              </p>
            )}
            <label>
              Supplier name <span>Optional</span>
              <Input maxLength={150} {...register("supplier_name")} />
            </label>
            <label>
              Purchase reference <span>Optional</span>
              <Input maxLength={100} {...register("purchase_reference")} />
            </label>
            <label>
              Notes <span>Optional</span>
              <Input maxLength={255} {...register("notes")} />
            </label>
            <div className="flex items-center justify-between gap-3">
              <strong>Purchase items</strong>
              <Button
                variant="outline"
                type="button"
                className="min-h-11"
                onClick={() =>
                  append({ inventory_item_id: "", quantity: 1, unit_cost: 0 })
                }
              >
                <Plus size={15} /> Add line
              </Button>
            </div>
            {fields.map((field, i) => (
              <div
                className="space-y-3 rounded-xl border border-border p-3"
                key={field.id}
              >
                <div className="flex items-center justify-between">
                  <strong>Item {i + 1}</strong>
                  {fields.length > 1 && (
                    <Button
                      variant="ghost"
                      type="button"
                      className="size-11 p-0"
                      aria-label={`Remove line ${i + 1}`}
                      onClick={() => remove(i)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
                <label>
                  Inventory item
                  <NativeSelect {...register(`lines.${i}.inventory_item_id`)}>
                    <option value="">Select an item</option>
                    {items
                      .filter((x) => x.is_active)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.unit})
                        </option>
                      ))}
                  </NativeSelect>
                </label>
                {errors.lines?.[i]?.inventory_item_id && (
                  <p className="text-sm text-destructive">Select an item.</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    Quantity
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      {...register(`lines.${i}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                  </label>
                  <label>
                    Unit cost (INR)
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      {...register(`lines.${i}.unit_cost`, {
                        valueAsNumber: true,
                      })}
                    />
                  </label>
                </div>
                {(errors.lines?.[i]?.quantity ||
                  errors.lines?.[i]?.unit_cost) && (
                  <p className="text-sm text-destructive">
                    Enter a positive quantity and non-negative cost.
                  </p>
                )}
                <p className="text-right font-semibold tabular-nums">
                  Line total{" "}
                  <strong>
                    {formatINR(
                      lineTotal(lines[i]?.quantity, lines[i]?.unit_cost),
                    )}
                  </strong>
                </p>
              </div>
            ))}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="shrink-0 border-t border-border p-5">
            <div>
              Purchase total <strong>{formatINR(total)}</strong>
            </div>
            <p>
              Purchases increase stock asset value and update weighted-average
              unit cost; P&amp;L cost is recognized when stock is used or
              wasted.
            </p>
            <Button
              variant="default"
              type="submit"
              className="min-h-11 w-full"
              disabled={pending}
            >
              {pending ? "Saving..." : "Record purchase"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
