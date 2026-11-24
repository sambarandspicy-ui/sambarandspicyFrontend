"use client";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuth } from "@/providers/auth-provider";

export function ResetDemoDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { resetDemo } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function reset() {
    setPending(true);
    setError("");
    try {
      await resetDemo();
      onOpenChange(false);
      onDone();
    } catch {
      setError("Could not reset demo data. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset demo data?"
      description="This restores the sample data, clears the current session and discards any unsaved cart."
      confirmLabel={pending ? "Resetting..." : "Reset demo data"}
      onConfirm={() => void reset()}
      pending={pending}
      destructive
    >
      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </ConfirmDialog>
  );
}
