"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { User } from "@/types/domain";
const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((x) => x.password === x.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });
type Values = z.infer<typeof schema>;
export function ResetPasswordDialog({
  user,
  onClose,
  onSave,
  pending,
}: {
  user: User;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
  pending: boolean;
}) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });
  async function save(v: Values) {
    try {
      setError("");
      await onSave(v.password);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset password.");
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
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>
          Set a new demo password for {user.full_name}.
        </DialogDescription>
        <form
          className="space-y-4 p-5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label_input:not([type=checkbox])]:mt-2 [&_label_select]:mt-2 [&_label_textarea]:mt-2"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <label>
            New password
            <Input
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </label>
          {errors.password && (
            <p className="text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          )}
          <label>
            Confirm password
            <Input
              type="password"
              autoComplete="new-password"
              {...register("confirm")}
            />
          </label>
          {errors.confirm && (
            <p className="text-sm text-destructive" role="alert">
              {errors.confirm.message}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              type="button"
              className="min-h-11"
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
              Reset password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
