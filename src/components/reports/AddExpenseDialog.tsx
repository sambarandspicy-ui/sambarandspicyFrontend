"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add operating expense</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Record an expense for its business date.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Business date"
                htmlFor="expense-date"
                error={errors.business_date?.message}
              >
                <Input
                  id="expense-date"
                  type="date"
                  error={Boolean(errors.business_date)}
                  {...register("business_date")}
                />
              </FormField>

              <FormField label="Category" htmlFor="expense-category">
                <NativeSelect id="expense-category" {...register("expense_category")}>
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
              </FormField>
            </div>

            <FormField
              label="Description"
              htmlFor="expense-description"
              required
              error={errors.description?.message}
            >
              <Input
                id="expense-description"
                maxLength={255}
                error={Boolean(errors.description)}
                {...register("description")}
              />
            </FormField>

            <FormField
              label="Amount (INR)"
              htmlFor="expense-amount"
              required
              error={errors.amount?.message}
            >
              <Input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                prefixText="₹"
                min="0.01"
                step="0.01"
                error={Boolean(errors.amount)}
                {...register("amount", { valueAsNumber: true })}
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
              {pending ? "Saving..." : "Save expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
