"use client";
import { useState } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FormField } from "@/components/shared/form-field";
import { Clock3 } from "lucide-react";
import { QueryError } from "@/components/shared/QueryState";
import { z } from "zod";
import type { BillDetail } from "@/types/domain";
import { formatINR } from "@/lib/format";

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Enter a reason for cancellation.")
  .max(255);

export function HeldBillsDrawer({
  open,
  onOpenChange,
  bills,
  loading,
  error,
  onRetry,
  canEdit,
  hasItems,
  onResume,
  onCancel,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: BillDetail[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  canEdit: boolean;
  hasItems: boolean;
  onResume: (bill: BillDetail) => void;
  onCancel: (id: number, reason: string) => Promise<void>;
  pending: boolean;
}) {
  const [replace, setReplace] = useState<BillDetail | null>(null);
  const [cancel, setCancel] = useState<BillDetail | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  function resume(b: BillDetail) {
    if (hasItems) setReplace(b);
    else {
      onResume(b);
      onOpenChange(false);
    }
  }

  async function cancelBill() {
    const result = reasonSchema.safeParse(reason);
    if (!result.success) {
      setMessage(result.error.issues[0].message);
      return;
    }
    try {
      await onCancel(cancel!.id, result.data);
      setCancel(null);
      setReason("");
      setMessage("");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not cancel this hold.",
      );
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold">
              Held Bills <span className="tabular-nums">{bills.length}</span>
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Orders saved for later at the counter.
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-3">
            {loading ? (
              <p className="flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                Loading held bills...
              </p>
            ) : error ? (
              <QueryError onRetry={onRetry} />
            ) : bills.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <Clock3 size={24} aria-hidden="true" />
                <strong className="text-foreground">No held bills</strong>
                <p>Saved orders will appear here.</p>
                <Button variant="outline" onClick={onRetry}>
                  Refresh held bills
                </Button>
              </div>
            ) : (
              [...bills]
                .sort(
                  (a, b) =>
                    (b.held_at ?? b.created_at).localeCompare(
                      a.held_at ?? a.created_at,
                    ) || b.id - a.id,
                )
                .map((b) => (
                  <article key={b.id}>
                    <Card className="p-4">
                      <div className="flex justify-between gap-3 [&_h3]:font-semibold [&_p]:mt-1 [&_p]:text-xs [&_p]:text-muted-foreground">
                        <div className="min-w-0">
                          <h3 className="truncate">
                            {b.hold_label || `Held Order #${b.id}`}
                          </h3>
                          <p>
                            {new Intl.DateTimeFormat("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(b.held_at ?? b.created_at))}{" "}
                            IST
                          </p>
                        </div>
                        <strong className="shrink-0 tabular-nums text-primary dark:text-[#ebc96f]">
                          {formatINR(b.total_amount)}
                        </strong>
                      </div>
                      <div className="space-y-1 py-3 text-sm text-muted-foreground">
                        <span>
                          {b.item_count} {b.item_count === 1 ? "item" : "items"}
                        </span>
                        <p className="break-words">
                          {b.items
                            .map(
                              (i) =>
                                `${i.quantity} x ${i.item_name_snapshot}${i.portion === "HALF" ? " (Half)" : ""}`,
                            )
                            .join(", ")}
                        </p>
                        {b.note && <p className="break-words">Note: {b.note}</p>}
                      </div>
                      {canEdit && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setMessage("");
                              setReason("");
                              setCancel(b);
                            }}
                          >
                            Cancel Hold
                          </Button>
                          <Button variant="default" onClick={() => resume(b)}>
                            Resume
                          </Button>
                        </div>
                      )}
                    </Card>
                  </article>
                ))
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!replace}
        onOpenChange={(v) => {
          if (!v) setReplace(null);
        }}
        title="Replace current cart?"
        description="Your current unsaved cart will be cleared before this held bill is loaded."
        cancelLabel="Keep current cart"
        confirmLabel="Replace cart"
        onConfirm={() => {
          if (replace) onResume(replace);
          setReplace(null);
          onOpenChange(false);
        }}
      />

      <ConfirmDialog
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v) setCancel(null);
        }}
        title="Cancel held bill?"
        description="This removes the order from the held bills list. A reason is required."
        cancelLabel="Go back"
        confirmLabel={pending ? "Cancelling..." : "Cancel hold"}
        pending={pending}
        destructive
        onConfirm={() => void cancelBill()}
      >
        <FormField htmlFor="cancel-reason" label="Cancellation reason" error={message}>
          <Textarea
            id="cancel-reason"
            maxLength={255}
            value={reason}
            error={Boolean(message)}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter a reason"
          />
        </FormField>
      </ConfirmDialog>
    </>
  );
}
