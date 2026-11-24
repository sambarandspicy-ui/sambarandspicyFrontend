"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { InventoryItem } from "@/types/domain";
import type { DailyEntryInput } from "@/services/api/types";
import { getBusinessDateIST } from "@/lib/format";
import { qty } from "./shared";
import { ApiError } from "@/types/api";
const schema = z
  .object({
    business_date: z.string().min(1, "Select a business date"),
    inventory_item_id: z.string().min(1, "Select a stock item"),
    used_qty: z.number().finite().min(0),
    wasted_qty: z.number().finite().min(0),
    notes: z.string().max(255),
  })
  .refine((v) => v.used_qty + v.wasted_qty > 0, {
    path: ["used_qty"],
    message: "Enter a quantity used or wasted.",
  });
type Values = z.infer<typeof schema>;
export function DailyStockLessCard({
  items,
  onSubmit,
  pending,
}: {
  items: InventoryItem[];
  onSubmit: (v: DailyEntryInput) => Promise<void>;
  pending: boolean;
}) {
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<DailyEntryInput | null>(null);
  const lock = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError: fieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_date: getBusinessDateIST(),
      inventory_item_id: "",
      used_qty: 0,
      wasted_qty: 0,
      notes: "",
    },
  });
  const id = useWatch({ control, name: "inventory_item_id" });
  const selected = items.find((x) => x.id === Number(id));
  async function post(input: DailyEntryInput) {
    if (lock.current) return;
    lock.current = true;
    setError("");
    try {
      await onSubmit(input);
      setRetry(null);
      reset({
        business_date: getBusinessDateIST(),
        inventory_item_id: "",
        used_qty: 0,
        wasted_qty: 0,
        notes: "",
      });
    } catch (e) {
      setRetry(
        e instanceof ApiError && e.status >= 400 && e.status < 500
          ? null
          : input,
      );
      setError(e instanceof Error ? e.message : "Could not save the entry.");
    } finally {
      lock.current = false;
    }
  }
  function submit(v: Values) {
    const item = items.find((i) => i.id === Number(v.inventory_item_id));
    if (!item || !item.is_active) {
      fieldError("inventory_item_id", { message: "Choose an active item." });
      return;
    }
    if (
      Math.round((v.used_qty + v.wasted_qty) * 1000) >
      Math.round(item.current_qty * 1000)
    ) {
      fieldError("used_qty", {
        message: "Used and wasted quantity exceeds on-hand stock.",
      });
      return;
    }
    void post({
      business_date: v.business_date,
      inventory_item_id: item.id,
      used_qty: v.used_qty,
      wasted_qty: v.wasted_qty,
      notes: v.notes.trim() || null,
      request_key: crypto.randomUUID(),
    });
  }
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Daily stock less</h2>
          <p>Record actual kitchen use and spoiled stock separately.</p>
        </div>
      </div>
      <form
        className="space-y-4 p-5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label_input:not([type=checkbox])]:mt-2 [&_label_select]:mt-2 [&_label_textarea]:mt-2"
        onSubmit={(e) => void handleSubmit(submit)(e)}
      >
        <fieldset className="space-y-4" disabled={pending || !!retry}>
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
            Stock item
            <NativeSelect {...register("inventory_item_id")}>
              <option value="">Select an item</option>
              {items
                .filter((i) => i.is_active)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit}) - On hand: {qty(i.current_qty)}
                  </option>
                ))}
            </NativeSelect>
          </label>
          {errors.inventory_item_id && (
            <p className="text-sm text-destructive">
              {errors.inventory_item_id.message}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Used quantity
              <Input
                type="number"
                min="0"
                step="0.001"
                {...register("used_qty", { valueAsNumber: true })}
              />
            </label>
            <label>
              Wasted quantity
              <Input
                type="number"
                min="0"
                step="0.001"
                {...register("wasted_qty", { valueAsNumber: true })}
              />
            </label>
          </div>
          {selected && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Available: {qty(selected.current_qty)} {selected.unit}
            </p>
          )}
          {errors.used_qty && (
            <p className="text-sm text-destructive" role="alert">
              {errors.used_qty.message}
            </p>
          )}
          {errors.wasted_qty && (
            <p className="text-sm text-destructive" role="alert">
              {errors.wasted_qty.message}
            </p>
          )}
          <label>
            Note <span>Optional</span>
            <Input
              maxLength={255}
              placeholder="Add a note"
              {...register("notes")}
            />
          </label>
        </fieldset>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {retry ? (
          <Button
            variant="default"
            type="button"
            className="min-h-11 w-full"
            disabled={pending}
            onClick={() => void post(retry)}
          >
            {pending ? "Saving..." : "Retry entry"}
          </Button>
        ) : (
          <Button
            variant="success"
            type="submit"
            className="min-h-11 w-full"
            disabled={pending}
          >
            {pending ? "Saving..." : "Save daily entry"}
          </Button>
        )}
      </form>
    </Card>
  );
}
