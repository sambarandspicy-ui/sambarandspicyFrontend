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
const schema = z.object({
  full_name: z.string().trim().min(1, "Enter a full name").max(120),
  username: z.string().trim().min(1, "Enter a username").max(80),
});
type Values = z.infer<typeof schema>;
export function EditUserDialog({
  user,
  users,
  onClose,
  onSave,
  pending,
}: {
  user: User;
  users: User[];
  onClose: () => void;
  onSave: (v: Values) => Promise<void>;
  pending: boolean;
}) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: fieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: user.full_name, username: user.username },
  });
  async function save(v: Values) {
    if (
      users.some(
        (x) =>
          x.id !== user.id &&
          x.username.toLowerCase() === v.username.toLowerCase(),
      )
    ) {
      fieldError("username", { message: "Username already exists." });
      return;
    }
    try {
      setError("");
      await onSave(v);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update user.");
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
        <DialogTitle>Edit user details</DialogTitle>
        <DialogDescription>
          Update the {user.role.replace("_", " ")} account.
        </DialogDescription>
        <form
          className="space-y-4 p-5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label_input:not([type=checkbox])]:mt-2 [&_label_select]:mt-2 [&_label_textarea]:mt-2"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <label>
            Full name
            <Input maxLength={120} {...register("full_name")} />
          </label>
          {errors.full_name && (
            <p className="text-sm text-destructive">
              {errors.full_name.message}
            </p>
          )}
          <label>
            Username
            <Input maxLength={80} {...register("username")} />
          </label>
          {errors.username && (
            <p className="text-sm text-destructive" role="alert">
              {errors.username.message}
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
              Save details
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
