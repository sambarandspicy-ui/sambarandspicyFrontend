"use client";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MenuItem } from "@/types/domain";
import { ImagePicker } from "./ImagePicker";

export function MenuImageDialog({
  item,
  onClose,
  onSave,
  kind = "dish",
}: {
  item: Pick<MenuItem, "name" | "image_path">;
  kind?: "dish" | "category";
  onClose: () => void;
  onSave: (file: File | null, removed: boolean) => Promise<void>;
}) {
  const [image, setImage] = useState(item.image_path);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const removed = !!item.image_path && !image && !file;
  async function save() {
    if ((!file && !removed) || processing || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(file, removed);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the image.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ImagePlus size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold">
              {kind === "category" ? "Category photo" : "Dish photo"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Choose and frame an image for {item.name}.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <ImagePicker
            label={kind === "category" ? "Category image" : "Dish image"}
            value={image}
            onChange={setImage}
            onFileSelect={setFile}
            onProcessingChange={setProcessing}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            disabled={processing || (!file && !removed)}
            onClick={() => void save()}
          >
            {saving ? "Saving..." : "Save photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
