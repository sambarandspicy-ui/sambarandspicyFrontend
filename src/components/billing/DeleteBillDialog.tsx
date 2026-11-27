"use client";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { BillDetail } from "@/types/domain";

export function DeleteBillDialog({
  bill,
  open,
  onOpenChange,
  pending,
  onDelete,
}: {
  bill: BillDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onDelete: (id: number) => Promise<void>;
}) {
  const [error, setError] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setError("");
    onOpenChange(nextOpen);
  }

  async function submitDelete() {
    if (!bill) return;
    setError("");
    try {
      await onDelete(bill.id);
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete this bill.",
      );
    }
  }

  const label = bill?.bill_number ?? (bill ? `Bill #${bill.id}` : "bill");

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Delete bill ${label}?`}
      description="This permanently removes the bill, items, and payment record from history and sales totals. This action cannot be undone."
      cancelLabel="Go back"
      confirmLabel={pending ? "Deleting..." : "Delete bill"}
      pending={pending}
      destructive
      onConfirm={() => void submitDelete()}
    >
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </ConfirmDialog>
  );
}

