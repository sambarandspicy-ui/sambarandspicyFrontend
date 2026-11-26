"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

import { useState } from "react";
import { AtSign, User as UserIcon } from "lucide-react";
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
        <DialogHeader>
          <DialogTitle>Edit user details</DialogTitle>
          <DialogDescription>
            Update the {user.role.replace("_", " ")} account.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <DialogBody className="space-y-4">
            <FormField label="Full name" htmlFor="edit-user-fullname" error={errors.full_name?.message} required>
              <Input id="edit-user-fullname" maxLength={120} leadingIcon={<UserIcon size={16} />} error={!!errors.full_name} {...register("full_name")} />
            </FormField>
            <FormField label="Username" htmlFor="edit-user-username" error={errors.username?.message} required>
              <Input id="edit-user-username" maxLength={80} leadingIcon={<AtSign size={16} />} error={!!errors.username} {...register("username")} />
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
              Save details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
