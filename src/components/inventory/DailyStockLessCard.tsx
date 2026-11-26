"use client";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/shared/form-field";
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
    <Card className="overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <h2>Daily stock less</h2>
        <p>Record actual kitchen use and spoiled stock separately.</p>
      </div>
      <form
        className="space-y-4 p-4 sm:p-5"
        onSubmit={(e) => void handleSubmit(submit)(e)}
      >
        <fieldset className="space-y-4 border-0" disabled={pending || !!retry}>
          <FormField
            label="Business date"
            htmlFor="daily-business-date"
            error={errors.business_date?.message}
          >
            <Input
              id="daily-business-date"
              type="date"
              error={Boolean(errors.business_date)}
              {...register("business_date")}
            />
          </FormField>

          <FormField
            label="Stock item"
            htmlFor="daily-stock-item"
            error={errors.inventory_item_id?.message}
          >
            <NativeSelect
              id="daily-stock-item"
              error={Boolean(errors.inventory_item_id)}
              {...register("inventory_item_id")}
            >
              <option value="">Select an item</option>
              {items
                .filter((i) => i.is_active)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit}) - On hand: {qty(i.current_qty)}
                  </option>
                ))}
            </NativeSelect>
          </FormField>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label="Used quantity"
              htmlFor="daily-used-qty"
              error={errors.used_qty?.message}
            >
              <Input
                id="daily-used-qty"
                type="number"
                inputMode="decimal"
                suffixText={selected?.unit}
                min="0"
                step="0.001"
                error={Boolean(errors.used_qty)}
                {...register("used_qty", { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Wasted quantity"
              htmlFor="daily-wasted-qty"
              error={errors.wasted_qty?.message}
            >
              <Input
                id="daily-wasted-qty"
                type="number"
                inputMode="decimal"
                suffixText={selected?.unit}
                min="0"
                step="0.001"
                error={Boolean(errors.wasted_qty)}
                {...register("wasted_qty", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          {selected && (
            <p className="text-xs leading-relaxed text-muted-foreground tabular-nums">
              Available: {qty(selected.current_qty)} {selected.unit}
            </p>
          )}

          <FormField label="Note (Optional)" htmlFor="daily-note">
            <Input
              id="daily-note"
              maxLength={255}
              placeholder="Add a note"
              {...register("notes")}
            />
          </FormField>
        </fieldset>

        {error && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        {retry ? (
          <Button
            variant="default"
            type="button"
            size="lg"
            className="w-full"
            loading={pending}
            onClick={() => void post(retry)}
          >
            {pending ? "Saving..." : "Retry entry"}
          </Button>
        ) : (
          <Button
            variant="success"
            type="submit"
            size="lg"
            className="w-full"
            loading={pending}
          >
            {pending ? "Saving..." : "Save daily entry"}
          </Button>
        )}
      </form>
    </Card>
  );
}
