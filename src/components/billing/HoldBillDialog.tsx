"use client";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form-field";
import { Alert } from "@/components/ui/alert";
import type { BillingCart } from "@/hooks/useBillingCart";
import type { BillInput } from "@/services/api/types";
export function HoldBillDialog({
  open,
  onOpenChange,
  cart,
  onHold,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: BillingCart;
  onHold: (input: BillInput) => Promise<void>;
  pending: boolean;
}) {
  const [label, setLabel] = useState(cart.state.holdLabel);
  const [note, setNote] = useState(cart.state.note);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await onHold({
        bill_id: cart.state.resumedBillId ?? undefined,
        hold_label: label.trim() || null,
        note: note.trim() || null,
        items: cart.state.items.map((x) => ({
          menu_item_id: x.menuItemId,
          portion: x.portion,
          quantity: x.quantity,
          line_discount_amount: x.lineDiscount,
        })),
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not hold this bill.");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Hold this bill
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Save the order to resume it at the counter later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <FormField label="Hold label" htmlFor="hold-label">
            <Input
              id="hold-label"
              maxLength={80}
              placeholder="e.g., Counter #2 - Parcel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </FormField>
          <FormField label="Note" htmlFor="hold-note">
            <Textarea
              id="hold-note"
              maxLength={255}
              placeholder="Add a note for later"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
          {error && (
            <Alert variant="destructive" role="alert">
              {error}
            </Alert>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Back</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save held bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
