"use client";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
      <SheetContent
        side="right"
        closeLabel="Close purchase drawer"
        className="w-full sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle className="text-lg font-bold">Add buying stock</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Record a supplier purchase and update stock balances.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <SheetBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Business date"
                htmlFor="purchase-date"
                error={errors.business_date?.message}
              >
                <Input
                  id="purchase-date"
                  type="date"
                  error={Boolean(errors.business_date)}
                  {...register("business_date")}
                />
              </FormField>
              <FormField label="Supplier name (Optional)" htmlFor="purchase-supplier">
                <Input
                  id="purchase-supplier"
                  maxLength={150}
                  {...register("supplier_name")}
                />
              </FormField>
              <FormField label="Purchase reference (Optional)" htmlFor="purchase-ref">
                <Input
                  id="purchase-ref"
                  maxLength={100}
                  {...register("purchase_reference")}
                />
              </FormField>
              <FormField label="Notes (Optional)" htmlFor="purchase-notes">
                <Input id="purchase-notes" maxLength={255} {...register("notes")} />
              </FormField>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <strong className="text-sm font-bold">Purchase items</strong>
              <Button
                variant="outline"
                size="sm"
                type="button"
                leftIcon={<Plus size={15} aria-hidden="true" />}
                onClick={() =>
                  append({ inventory_item_id: "", quantity: 1, unit_cost: 0 })
                }
              >
                Add line
              </Button>
            </div>

            {fields.map((field, i) => {
              const selectedItem = items.find(
                (x) => x.id === Number(lines[i]?.inventory_item_id),
              );
              return (
                <div
                  className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5"
                  key={field.id}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm">Item {i + 1}</strong>
                    {fields.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove line ${i + 1}`}
                        onClick={() => remove(i)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <FormField
                    label="Inventory item"
                    htmlFor={`purchase-line-${i}-item`}
                    error={errors.lines?.[i]?.inventory_item_id ? "Select an item." : undefined}
                  >
                    <NativeSelect
                      id={`purchase-line-${i}-item`}
                      error={Boolean(errors.lines?.[i]?.inventory_item_id)}
                      {...register(`lines.${i}.inventory_item_id`)}
                    >
                      <option value="">Select an item</option>
                      {items
                        .filter((x) => x.is_active)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} ({x.unit})
                          </option>
                        ))}
                    </NativeSelect>
                  </FormField>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      label="Quantity"
                      htmlFor={`purchase-line-${i}-qty`}
                      error={errors.lines?.[i]?.quantity?.message}
                    >
                      <Input
                        id={`purchase-line-${i}-qty`}
                        type="number"
                        inputMode="decimal"
                        suffixText={selectedItem?.unit}
                        min="0.001"
                        step="0.001"
                        error={Boolean(errors.lines?.[i]?.quantity)}
                        {...register(`lines.${i}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </FormField>
                    <FormField
                      label="Unit cost (INR)"
                      htmlFor={`purchase-line-${i}-cost`}
                      error={errors.lines?.[i]?.unit_cost?.message}
                    >
                      <Input
                        id={`purchase-line-${i}-cost`}
                        type="number"
                        inputMode="decimal"
                        prefixText="₹"
                        min="0"
                        step="0.0001"
                        error={Boolean(errors.lines?.[i]?.unit_cost)}
                        {...register(`lines.${i}.unit_cost`, {
                          valueAsNumber: true,
                        })}
                      />
                    </FormField>
                  </div>

                  <p className="text-right text-sm font-semibold tabular-nums">
                    Line total:{" "}
                    <strong>
                      {formatINR(
                        lineTotal(lines[i]?.quantity, lines[i]?.unit_cost),
                      )}
                    </strong>
                  </p>
                </div>
              );
            })}

            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
          </SheetBody>

          <SheetFooter className="space-y-2">
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold">Purchase total</span>
              <strong className="text-lg font-extrabold tabular-nums text-primary dark:text-[#ebc96f]">
                {formatINR(total)}
              </strong>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Purchases increase stock asset value and update weighted-average
              unit cost; P&amp;L cost is recognized when stock is used or
              wasted.
            </p>
            <Button
              variant="default"
              type="submit"
              size="lg"
              className="w-full"
              loading={pending}
            >
              {pending ? "Saving..." : "Record purchase"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
