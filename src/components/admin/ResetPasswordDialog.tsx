"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

import { useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new demo password for {user.full_name}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <DialogBody className="space-y-4">
            <FormField label="New password" htmlFor="reset-password-new" error={errors.password?.message} required>
              <Input
                id="reset-password-new"
                type="password"
                autoComplete="new-password"
                leadingIcon={<Lock size={16} />}
                showPasswordToggle
                error={!!errors.password}
                {...register("password")}
              />
            </FormField>
            <FormField label="Confirm password" htmlFor="reset-password-confirm" error={errors.confirm?.message} required>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                leadingIcon={<Lock size={16} />}
                showPasswordToggle
                error={!!errors.confirm}
                {...register("confirm")}
              />
            </FormField>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              className="min-h-11 sm:min-h-10"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              className="min-h-11 sm:min-h-10"
              loading={pending}
            >
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
