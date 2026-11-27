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
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Clock3 } from "lucide-react";
import { QueryError } from "@/components/shared/QueryState";
import type { BillDetail } from "@/types/domain";
import { formatINR } from "@/lib/format";
import { CancelBillDialog } from "./CancelBillDialog";

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

  function resume(b: BillDetail) {
    if (hasItems) setReplace(b);
    else {
      onResume(b);
      onOpenChange(false);
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
                            onClick={() => setCancel(b)}
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

      <CancelBillDialog
        key={cancel?.id ?? "held-none"}
        bill={cancel}
        open={!!cancel}
        onOpenChange={(v) => {
          if (!v) setCancel(null);
        }}
        title="Cancel held bill?"
        description="This removes the order from the held bills list. A reason is required."
        cancelLabel="Go back"
        confirmLabel="Cancel hold"
        pendingLabel="Cancelling..."
        fieldId="cancel-reason"
        placeholder="Enter a reason"
        fallbackError="Could not cancel this hold."
        pending={pending}
        onCancel={onCancel}
      />
    </>
  );
}
