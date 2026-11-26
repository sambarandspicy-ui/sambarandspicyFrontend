"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import type { AdjustmentInput } from "@/services/api/types";
import { getBusinessDateIST } from "@/lib/format";
import { qty } from "./shared";

const schema = z.object({
  movement_type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT"]),
  quantity: z.number().finite().positive("Enter a positive quantity"),
  notes: z
    .string()
    .trim()
    .min(5, "Enter a reason of at least 5 characters")
    .max(255),
});

type Values = z.infer<typeof schema>;

export function StockAdjustmentDialog({
  item,
  onClose,
  onSave,
  pending,
}: {
  item: InventoryItem;
  onClose: () => void;
  onSave: (v: AdjustmentInput) => Promise<void>;
  pending: boolean;
}) {
  const [error, setError] = useState("");
  const {
    register,
    control,
    handleSubmit,
    setError: fieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { movement_type: "ADJUSTMENT_IN", quantity: 0, notes: "" },
  });
  const [direction, quantity] = useWatch({
    control,
    name: ["movement_type", "quantity"],
  });

  async function save(v: Values) {
    if (v.movement_type === "ADJUSTMENT_OUT" && v.quantity > item.current_qty) {
      fieldError("quantity", { message: "Quantity exceeds on-hand stock." });
      return;
    }
    try {
      setError("");
      await onSave({
        ...v,
        inventory_item_id: item.id,
        business_date: getBusinessDateIST(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save correction.");
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
          <DialogTitle>Stock correction</DialogTitle>
          <DialogDescription>
            {item.name} - current balance {qty(item.current_qty)} {item.unit}. A
            correction adds a new ledger movement.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <DialogBody className="space-y-4">
            <FormField label="Direction" htmlFor="adjust-direction">
              <NativeSelect id="adjust-direction" {...register("movement_type")}>
                <option value="ADJUSTMENT_IN">
                  Increase stock (ADJUSTMENT_IN)
                </option>
                <option value="ADJUSTMENT_OUT">
                  Decrease stock (ADJUSTMENT_OUT)
                </option>
              </NativeSelect>
            </FormField>

            <FormField
              label="Quantity"
              htmlFor="adjust-qty"
              error={errors.quantity?.message}
            >
              <Input
                id="adjust-qty"
                type="number"
                inputMode="decimal"
                suffixText={item.unit}
                min="0.001"
                step="0.001"
                error={Boolean(errors.quantity)}
                {...register("quantity", { valueAsNumber: true })}
              />
            </FormField>

            <p className="rounded-xl border border-border bg-secondary/70 p-3 text-sm tabular-nums dark:bg-muted/60">
              New balance:{" "}
              <strong className="text-primary dark:text-[#ebc96f]">
                {qty(
                  item.current_qty +
                    (direction === "ADJUSTMENT_OUT" ? -1 : 1) *
                      (Number.isFinite(quantity) ? quantity : 0),
                )}{" "}
                {item.unit}
              </strong>
            </p>

            <FormField
              label="Reason / note"
              htmlFor="adjust-notes"
              error={errors.notes?.message}
            >
              <Textarea
                id="adjust-notes"
                maxLength={255}
                error={Boolean(errors.notes)}
                {...register("notes")}
              />
            </FormField>

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
              {pending ? "Saving..." : "Confirm correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
