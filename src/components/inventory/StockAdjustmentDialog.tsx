"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
        <DialogTitle>Stock correction</DialogTitle>
        <DialogDescription>
          {item.name} - current balance {qty(item.current_qty)} {item.unit}. A
          correction adds a new ledger movement.
        </DialogDescription>
        <form
          className="space-y-4 p-5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label_input:not([type=checkbox])]:mt-2 [&_label_select]:mt-2 [&_label_textarea]:mt-2"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <label>
            Direction
            <NativeSelect {...register("movement_type")}>
              <option value="ADJUSTMENT_IN">
                Increase stock (ADJUSTMENT_IN)
              </option>
              <option value="ADJUSTMENT_OUT">
                Decrease stock (ADJUSTMENT_OUT)
              </option>
            </NativeSelect>
          </label>
          <label>
            Quantity
            <Input
              type="number"
              min="0.001"
              step="0.001"
              {...register("quantity", { valueAsNumber: true })}
            />
          </label>
          {errors.quantity && (
            <p className="text-sm text-destructive" role="alert">
              {errors.quantity.message}
            </p>
          )}
          <p className="rounded-xl border border-border bg-muted p-3 text-sm">
            New balance:{" "}
            <strong>
              {qty(
                item.current_qty +
                  (direction === "ADJUSTMENT_OUT" ? -1 : 1) *
                    (Number.isFinite(quantity) ? quantity : 0),
              )}{" "}
              {item.unit}
            </strong>
          </p>
          <label>
            Reason / note
            <Textarea maxLength={255} {...register("notes")} />
          </label>
          {errors.notes && (
            <p className="text-sm text-destructive" role="alert">
              {errors.notes.message}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
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
              {pending ? "Saving..." : "Confirm correction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
