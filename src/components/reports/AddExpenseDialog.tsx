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
import { getBusinessDateIST } from "@/lib/format";
import type { ExpenseInput } from "@/services/api/types";
const schema = z.object({
  business_date: z.string().min(1, "Select a date"),
  expense_category: z.enum([
    "RENT",
    "WAGES",
    "ELECTRICITY",
    "GAS",
    "PACKAGING",
    "MAINTENANCE",
    "OTHER",
  ]),
  description: z.string().trim().min(1, "Enter a description").max(255),
  amount: z.number().finite().positive("Enter an amount greater than zero"),
});
type Values = z.infer<typeof schema>;
export function AddExpenseDialog({
  onClose,
  onSave,
  pending,
}: {
  onClose: () => void;
  onSave: (v: ExpenseInput) => Promise<void>;
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
      business_date: getBusinessDateIST(),
      expense_category: "RENT",
      description: "",
      amount: 0,
    },
  });
  async function save(v: Values) {
    try {
      setError("");
      await onSave(v);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save expense.");
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
        <div className="flex items-start justify-between gap-3 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <DialogTitle>Add operating expense</DialogTitle>
            <DialogDescription>
              Record an expense for its business date.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="size-11 p-0"
              aria-label="Close expense dialog"
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>
        <form
          className="space-y-4 p-5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label_input:not([type=checkbox])]:mt-2 [&_label_select]:mt-2 [&_label_textarea]:mt-2"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
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
            Category
            <NativeSelect {...register("expense_category")}>
              {[
                "RENT",
                "WAGES",
                "ELECTRICITY",
                "GAS",
                "PACKAGING",
                "MAINTENANCE",
                "OTHER",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </NativeSelect>
          </label>
          <label>
            Description
            <Input maxLength={255} {...register("description")} />
          </label>
          {errors.description && (
            <p className="text-sm text-destructive">
              {errors.description.message}
            </p>
          )}
          <label>
            Amount (INR)
            <Input
              type="number"
              min="0.01"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
            />
          </label>
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              className="min-h-11"
              type="button"
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
              {pending ? "Saving..." : "Save expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
