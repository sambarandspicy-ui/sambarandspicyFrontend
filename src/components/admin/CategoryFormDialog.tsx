"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/shared/form-field";

import { useState } from "react";
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
import { ImageIcon, Layers } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import type { Category } from "@/types/domain";
import type { CategoryInput } from "@/services/api/types";
import { ImagePicker } from "./ImagePicker";
const schema = z.object({
  name: z.string().trim().min(1, "Enter a category name").max(120),
  sort_order: z.number().int("Sort order must be an integer"),
  is_active: z.boolean(),
});
type Values = z.infer<typeof schema>;
export function CategoryFormDialog({
  category,
  categories,
  onClose,
  onSave,
  pending,
}: {
  category: Category | null;
  categories: Category[];
  onClose: () => void;
  onSave: (v: CategoryInput, file?: File | null) => Promise<void>;
  pending: boolean;
}) {
  const [image, setImage] = useState(category?.image_path ?? null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setError: fieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? "",
      sort_order: category?.sort_order ?? 0,
      is_active: category?.is_active ?? true,
    },
  });
  async function save(v: Values) {
    if (
      categories.some(
        (c) =>
          c.id !== category?.id &&
          c.name.trim().toLowerCase() === v.name.toLowerCase(),
      )
    ) {
      fieldError("name", { message: "Category name already exists." });
      return;
    }
    try {
      setError("");
      const imagePathToSend = selectedFile
        ? (category?.image_path ?? null)
        : image;
      await onSave({ ...v, image_path: imagePathToSend }, selectedFile);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save category.");
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !pending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <span className="text-xs font-semibold tracking-widest text-primary">
            MENU MANAGEMENT
          </span>
          <DialogTitle>
            {category ? "Edit category" : "Add category"}
          </DialogTitle>
          <DialogDescription>
            Manage the category and its single cover image.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <DialogBody className="space-y-4">
            <Card className="space-y-4 bg-muted/30 p-4 sm:p-5">
              <div className="[&_h3]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
                <h3 className="flex items-center gap-2">
                  <Layers
                    size={17}
                    className="text-primary"
                    aria-hidden="true"
                  />{" "}
                  Category details
                </h3>
                <p>Organize dishes for your counter menu.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="category-name" error={errors.name?.message} required>
                  <Input
                    id="category-name"
                    maxLength={120}
                    placeholder="e.g. Dosa"
                    error={!!errors.name}
                    {...register("name")}
                  />
                </FormField>
                <FormField label="Sort order" htmlFor="category-sort-order" error={errors.sort_order?.message}>
                  <Input
                    id="category-sort-order"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    error={!!errors.sort_order}
                    {...register("sort_order", { valueAsNumber: true })}
                  />
                </FormField>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted p-3 text-sm font-semibold [&_input]:size-4 [&_input]:accent-primary">
                <input type="checkbox" {...register("is_active")} /> Active
                category
              </label>
            </Card>
            <Card className="space-y-4 bg-muted/30 p-4 sm:p-5">
              <div className="[&_h3]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
                <h3 className="flex items-center gap-2">
                  <ImageIcon
                    size={17}
                    className="text-primary"
                    aria-hidden="true"
                  />{" "}
                  Category image
                </h3>
                <p>Choose how this category appears on your menu.</p>
              </div>
              <ImagePicker
                label="Category image"
                value={image}
                onChange={setImage}
                onFileSelect={setSelectedFile}
                onProcessingChange={setImageProcessing}
              />
            </Card>
            {error && (
              <Alert variant="destructive" role="alert" className="py-3">
                {error}
              </Alert>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              className="min-h-11 sm:min-h-10"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              className="min-h-11 sm:min-h-10"
              loading={pending}
              disabled={imageProcessing}
            >
              {pending ? "Saving..." : "Save category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
