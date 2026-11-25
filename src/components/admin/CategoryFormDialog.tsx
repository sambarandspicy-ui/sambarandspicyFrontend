"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImageIcon, Layers, X } from "lucide-react";
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
      <DialogContent showClose={false} className="max-w-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-2 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <span className="text-xs font-semibold tracking-widest text-primary">
              MENU MANAGEMENT
            </span>
            <DialogTitle>
              {category ? "Edit category" : "Add category"}
            </DialogTitle>
            <DialogDescription>
              Manage the category and its single cover image.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              className="size-11 p-0"
              aria-label="Close category dialog"
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 pt-4 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_label_input:not([type=checkbox])]:mt-2 [&_label_select]:mt-2 [&_label_textarea]:mt-2"
          onSubmit={(e) => void handleSubmit(save)(e)}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
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
                <div>
                  <label>
                    Name
                    <Input
                      maxLength={120}
                      placeholder="e.g. Dosa"
                      {...register("name")}
                    />
                  </label>
                  {errors.name && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label>
                    Sort order
                    <Input
                      type="number"
                      step="1"
                      {...register("sort_order", { valueAsNumber: true })}
                    />
                  </label>
                  {errors.sort_order && (
                    <p className="text-sm text-destructive">
                      {errors.sort_order.message}
                    </p>
                  )}
                </div>
              </div>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-muted p-3 text-sm [&_input]:size-4 [&_input]:accent-blue-600">
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
          </div>
          {error && (
            <Alert variant="destructive" role="alert" className="shrink-0 py-3">
              {error}
            </Alert>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              type="button"
              className="min-h-11"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              className="min-h-11"
              disabled={pending || imageProcessing}
            >
              {pending ? "Saving..." : "Save category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
