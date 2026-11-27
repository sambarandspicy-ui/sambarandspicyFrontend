"use client";
import { useState } from "react";
import { z } from "zod";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Textarea } from "@/components/ui/textarea";
import type { BillDetail } from "@/types/domain";

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Enter a reason for cancellation.")
  .max(255);

export function CancelBillDialog({
  bill,
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Go back",
  confirmLabel = "Cancel bill",
  pendingLabel = "Cancelling...",
  fieldId = "cancel-bill-reason",
  placeholder = "Enter a reason (e.g. billed by mistake)",
  fallbackError = "Could not cancel this bill.",
  pending,
  onCancel,
}: {
  bill: BillDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel?: string;
  confirmLabel?: string;
  pendingLabel?: string;
  fieldId?: string;
  placeholder?: string;
  fallbackError?: string;
  pending: boolean;
  onCancel: (id: number, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setReason("");
      setMessage("");
    }
    onOpenChange(nextOpen);
  }

  async function submitCancel() {
    if (!bill) return;
    const result = reasonSchema.safeParse(reason);
    if (!result.success) {
      setMessage(result.error.issues[0].message);
      return;
    }
    try {
      await onCancel(bill.id, result.data);
      setReason("");
      setMessage("");
      onOpenChange(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : fallbackError);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      cancelLabel={cancelLabel}
      confirmLabel={pending ? pendingLabel : confirmLabel}
      pending={pending}
      destructive
      onConfirm={() => void submitCancel()}
    >
      <FormField htmlFor={fieldId} label="Cancellation reason" error={message}>
        <Textarea
          id={fieldId}
          maxLength={255}
          value={reason}
          error={Boolean(message)}
          onChange={(e) => {
            setReason(e.target.value);
            if (message) setMessage("");
          }}
          placeholder={placeholder}
        />
      </FormField>
    </ConfirmDialog>
  );
}
