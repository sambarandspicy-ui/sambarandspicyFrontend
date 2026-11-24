"use client";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
        <div className="flex items-start gap-3 pr-10">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-primary">
            <ImagePlus size={21} aria-hidden="true" />
          </span>
          <div>
            <DialogTitle className="text-lg font-bold">
              {kind === "category" ? "Category photo" : "Dish photo"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Choose and frame an image for {item.name}.
            </DialogDescription>
          </div>
        </div>
        <div className="mt-5 min-h-0 overflow-y-auto pr-1">
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
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={saving || processing || (!file && !removed)}
            onClick={() => void save()}
          >
            {saving ? "Saving..." : "Save photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
