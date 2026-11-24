"use client";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

/* eslint-disable @next/next/no-img-element -- Demo images may be data URLs or local assets. */
import { useEffect, useRef, useState } from "react";
import { resolveAssetUrl } from "@/lib/format";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 100_000;
export function validateImageFile(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Choose a JPG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 5 MB or smaller.";
  return null;
}
async function compressImage(image: HTMLImageElement, crop?: { x: number; y: number; width: number; height: number }) {
  const region = crop ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  if (!region.width || !region.height) throw new Error("The image could not be loaded. Please choose another image.");
  let scale = Math.min(1, 1280 / Math.max(region.width, region.height));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process the image in this browser.");
  for (let attempt = 0; attempt < 8; attempt++) {
    canvas.width = Math.max(1, Math.round(region.width * scale));
    canvas.height = Math.max(1, Math.round(region.height * scale));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.75, 0.65, 0.5, 0.4]) {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not encode image.")), "image/jpeg", quality);
      });
      if (blob.size < MAX_STORED_IMAGE_BYTES) {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
          reader.onerror = () => reject(new Error("Could not read image."));
          reader.readAsDataURL(blob);
        });
        return { data, file: new File([blob], "image.jpg", { type: "image/jpeg" }) };
      }
    }
    scale *= 0.75;
  }
  throw new Error("Could not compress the image below 100 KB. Please choose another image.");
}
export function ImagePicker({
  value,
  onChange,
  onFileSelect,
  onProcessingChange,
  label,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  onFileSelect?: (f: File | null) => void;
  onProcessingChange?: (processing: boolean) => void;
  label: string;
}) {
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [horizontal, setHorizontal] = useState(50);
  const [vertical, setVertical] = useState(50);
  const previewRef = useRef<HTMLImageElement>(null);
  const selectionRef = useRef(0);
  useEffect(() => () => { selectionRef.current++; }, []);
  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const issue = validateImageFile(file);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    const selection = ++selectionRef.current;
    setProcessing(true);
    onProcessingChange?.(true);
    setSource(null);
    setHorizontal(50);
    setVertical(50);
    const reader = new FileReader();
    reader.onload = () => {
      if (selection !== selectionRef.current) return;
      if (typeof reader.result !== "string") {
        setError("Could not read image.");
        setProcessing(false);
        onProcessingChange?.(false);
      } else {
        const original = reader.result;
        const image = new Image();
        image.onload = async () => {
          if (selection !== selectionRef.current) return;
          try {
            const compressed = await compressImage(image);
            if (selection !== selectionRef.current) return;
            setSource(original);
            onFileSelect?.(compressed.file);
            onChange(compressed.data);
          } catch (e) {
            if (selection === selectionRef.current) setError(e instanceof Error ? e.message : "Could not compress image.");
          } finally {
            if (selection === selectionRef.current) {
              setProcessing(false);
              onProcessingChange?.(false);
            }
          }
        };
        image.onerror = () => {
          if (selection !== selectionRef.current) return;
          setError("The image could not be loaded. Please choose another image.");
          setProcessing(false);
          onProcessingChange?.(false);
        };
        image.src = original;
      }
    };
    reader.onerror = () => {
      if (selection === selectionRef.current) {
        setError("Could not read image.");
        setProcessing(false);
        onProcessingChange?.(false);
      }
    };
    reader.readAsDataURL(file);
  }
  function remove() {
    selectionRef.current++;
    setSource(null);
    setError("");
    onFileSelect?.(null);
    onChange(null);
  }
  async function applyFraming() {
    const image = previewRef.current;
    if (!image?.naturalWidth || !image.naturalHeight) {
      setError("The image could not be loaded. Please choose another image.");
      return;
    }
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const x = (image.naturalWidth - side) * horizontal / 100;
    const y = (image.naturalHeight - side) * vertical / 100;
    const selection = ++selectionRef.current;
    setProcessing(true);
    onProcessingChange?.(true);
    try {
      const compressed = await compressImage(image, { x, y, width: side, height: side });
      if (selection !== selectionRef.current) return;
      onFileSelect?.(compressed.file);
      onChange(compressed.data);
      setSource(null);
      setError("");
    } catch (e) {
      if (selection === selectionRef.current) setError(e instanceof Error ? e.message : "Could not frame image.");
    } finally {
      if (selection === selectionRef.current) {
        setProcessing(false);
        onProcessingChange?.(false);
      }
    }
  }
  return (
    <div className="space-y-2">
      <label className="block rounded-xl border border-dashed border-input bg-muted/50 p-4 text-sm font-semibold">
        {label}
        <input
          type="file"
          className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:font-semibold file:text-white"
          accept="image/jpeg,image/png,image/webp"
          disabled={processing}
          onChange={choose}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        JPG, PNG, or WebP · up to 5 MB · saved below 100 KB.
      </p>
      {processing && <p role="status" className="text-xs text-muted-foreground">Compressing image...</p>}
      {error && (
        <Alert variant="destructive" role="alert">
          {error}
        </Alert>
      )}
      {source && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold">Frame image</p>
          <p className="text-xs text-muted-foreground">The image starts centered. Adjust the sliders to keep the main subject in view, then apply the framing.</p>
          <div className="mx-auto aspect-square w-full max-w-48 overflow-hidden rounded-xl bg-muted">
            <img ref={previewRef} src={source} alt={`${label} framing preview`} className="h-full w-full object-cover" style={{ objectPosition: `${horizontal}% ${vertical}%` }} />
          </div>
          <label className="block text-xs text-muted-foreground">Left / right
            <input type="range" min="0" max="100" value={horizontal} disabled={processing} onChange={(event) => setHorizontal(Number(event.target.value))} className="block w-full accent-blue-600" />
          </label>
          <label className="block text-xs text-muted-foreground">Up / down
            <input type="range" min="0" max="100" value={vertical} disabled={processing} onChange={(event) => setVertical(Number(event.target.value))} className="block w-full accent-blue-600" />
          </label>
          <Button type="button" variant="outline" className="min-h-11" disabled={processing} onClick={() => void applyFraming()}>Apply framing</Button>
        </div>
      )}
      {value && (
        <div className="flex items-center gap-3 [&_img]:h-16 [&_img]:w-20 [&_img]:rounded-xl [&_img]:object-cover">
          <img
            src={resolveAssetUrl(value, "/images/dish.svg")}
            alt={`${label} preview`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/images/dish.svg";
            }}
          />
          <Button
            variant="outline"
            type="button"
            className="min-h-11"
            disabled={processing}
            onClick={remove}
          >
            Remove image
          </Button>
        </div>
      )}
    </div>
  );
}
