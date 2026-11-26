"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillDetail, UserRole } from "@/types/domain";
import { useStoreSettings } from "@/hooks/queries";
import { ReceiptTemplate } from "./ReceiptTemplate";
import { rawBtReceiptPng, rawBtReceiptUrl } from "@/lib/rawbt-receipt";
let previousPrintCleanup: (() => void) | null = null;

async function buildReceiptRasterPng(
  bill: BillDetail,
  footer: string | null | undefined,
  isReprint: boolean,
): Promise<string | null> {
  if (typeof Image === "undefined") return null;
  const logo = new Image();
  logo.src = "/images/receipt-logo.png";
  if (typeof logo.decode !== "function") return null;
  await logo.decode();
  return rawBtReceiptPng(bill, footer, isReprint, logo);
}

export function ReceiptDialog({
  bill,
  open,
  onOpenChange,
  isReprint,
  role,
  onLogReprint,
  preview = false,
}: {
  bill: BillDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReprint: boolean;
  role: UserRole;
  onLogReprint: (id: number) => Promise<void>;
  preview?: boolean;
}) {
  const settings = useStoreSettings(open);
  const receipt = useRef<HTMLDivElement>(null);
  const attempted = useRef(false);
  const inFlight = useRef(false);
  const reprintLogged = useRef(false);
  const preparationVersion = useRef(0);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);
  const [previewRaster, setPreviewRaster] = useState<{
    key: string;
    src: string;
  } | null>(null);
  const footerText = settings.data
    ? settings.data.receipt_footer
    : "Thank you for visiting! Come again.";
  const previewKey = bill
    ? `${bill.id}:${isReprint}:${footerText ?? ""}`
    : "";

  useEffect(() => {
    if (!open || !preview || !bill || settings.isLoading) return;
    let cancelled = false;
    void buildReceiptRasterPng(bill, footerText, isReprint)
      .then((src) => {
        if (!cancelled && src) setPreviewRaster({ key: previewKey, src });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, preview, bill, footerText, isReprint, settings.isLoading, previewKey]);

  const print = useCallback(async () => {
    if (!bill || inFlight.current) return;
    inFlight.current = true;
    setPrinting(true);
    setError("");
    let frame: HTMLIFrameElement | undefined;
    let printWindow: Window | null = null;
    let timeout: number | undefined;
    const cleanup = () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      window.removeEventListener("afterprint", cleanup);
      printWindow?.removeEventListener("afterprint", cleanup);
      frame?.remove();
      if (previousPrintCleanup === cleanup) {
        previousPrintCleanup = null;
      }
    };
    try {
      const isUnsyncedLocalBill =
        bill.id <= 0 || (bill.syncStatus !== undefined && bill.syncStatus !== "SYNCED");
      if (isReprint && role !== "READ_ONLY" && !reprintLogged.current && !isUnsyncedLocalBill) {
        await onLogReprint(bill.id);
        reprintLogged.current = true;
      }
      const original = receipt.current?.querySelector(".receipt-paper");
      if (!original) throw new Error("Receipt is unavailable");
      previousPrintCleanup?.();
      frame = document.createElement("iframe");
      frame.title = "Receipt print document";
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      Object.assign(frame.style, {
        position: "fixed",
        width: "1px",
        height: "1px",
        bottom: "0",
        right: "0",
        border: "0",
        opacity: "0",
        pointerEvents: "none",
      });
      document.body.appendChild(frame);
      const printDocument = frame.contentDocument;
      printWindow = frame.contentWindow;
      if (!printDocument || !printWindow)
        throw new Error("Print document is unavailable");
      printDocument.documentElement.dataset.receiptPrint = "thermal";
      const stylesReady: Promise<void>[] = [];
      for (const node of document.querySelectorAll(
        'link[rel~="stylesheet"], style',
      )) {
        const copy = node.cloneNode(true) as HTMLElement;
        if (node.tagName === "LINK") {
          const link = copy as HTMLLinkElement;
          link.href = (node as HTMLLinkElement).href;
          stylesReady.push(
            new Promise((resolve, reject) => {
              link.addEventListener("load", () => resolve(), { once: true });
              link.addEventListener(
                "error",
                () => reject(new Error("Receipt styles could not be loaded")),
                { once: true },
              );
            }),
          );
        }
        printDocument.head.appendChild(copy);
      }
      const style = printDocument.createElement("style");
      style.textContent = "@page { margin: 0; }";
      printDocument.head.appendChild(style);
      const printRoot = printDocument.createElement("main");
      printRoot.className = "receipt-print-root";
      const copy = original.cloneNode(true) as HTMLElement;
      copy.removeAttribute("id");
      printRoot.appendChild(copy);
      printDocument.body.appendChild(printRoot);
      previousPrintCleanup = cleanup;
      window.addEventListener("afterprint", cleanup, { once: true });
      printWindow.addEventListener("afterprint", cleanup, { once: true });
      timeout = window.setTimeout(cleanup, 60_000);
      {
        let styleTimeout: number | undefined;
        try {
          await Promise.race([
            Promise.all(stylesReady).then(async () => {
              // The receipt is hidden until print, so explicitly load its local font first.
              if (printDocument.fonts) await printDocument.fonts.load('30px "Receipt Lobster"');
              const logo = copy.querySelector(".receipt-logo") as HTMLImageElement | null;
              if (logo && typeof logo.decode === "function") await logo.decode();
            }),
            new Promise<void>((_, reject) => {
              styleTimeout = window.setTimeout(
                () => reject(new Error("Receipt styles took too long to load")),
                8000,
              );
            }),
          ]);
        } finally {
          if (styleTimeout !== undefined) window.clearTimeout(styleTimeout);
        }
      }
      // Match desktop print output pixel-for-pixel to the RawBT receipt raster when canvas is available.
      try {
        const existingRaster = copy.querySelector(".receipt-raster") as HTMLImageElement | null;
        if (!existingRaster) {
          const rasterSrc =
            previewRaster?.key === previewKey
              ? previewRaster.src
              : await buildReceiptRasterPng(bill, footerText, isReprint);
          if (rasterSrc) {
            const rasterImg = printDocument.createElement("img");
            rasterImg.className = "receipt-raster";
            rasterImg.src = rasterSrc;
            rasterImg.alt = bill.bill_number ?? `Receipt #${bill.id}`;
            if (typeof rasterImg.decode === "function") await rasterImg.decode();
            copy.dataset.receiptMode = "raster";
            copy.appendChild(rasterImg);
          }
        }
      } catch {
        // Keep the CSS-styled HTML receipt when canvas raster rendering is unavailable.
      }
      if (typeof printWindow.print !== "function")
        throw new Error("Printing is not supported in this browser");
      printWindow.print();
      onOpenChange(false);
    } catch {
      cleanup();
      setError(
        "Could not start printing. The paid bill is saved; check the printer and try again.",
      );
    } finally {
      inFlight.current = false;
      setPrinting(false);
    }
  }, [bill, footerText, isReprint, onLogReprint, onOpenChange, previewKey, previewRaster, role]);

  const printRawBt = useCallback(async () => {
    if (!bill || inFlight.current) return;
    const version = ++preparationVersion.current;
    inFlight.current = true;
    setPrinting(true);
    setError("");
    try {
      const logo = new Image();
      logo.src = "/images/receipt-logo.png";
      const isUnsyncedLocalBill =
        bill.id <= 0 || (bill.syncStatus !== undefined && bill.syncStatus !== "SYNCED");
      const logReprint =
        isReprint && role !== "READ_ONLY" && !reprintLogged.current && !isUnsyncedLocalBill
          ? onLogReprint(bill.id).then(() => { reprintLogged.current = true; })
          : Promise.resolve();
      await Promise.all([logo.decode(), logReprint]);
      if (version !== preparationVersion.current) return;
      const url = rawBtReceiptUrl(bill, footerText, isReprint, logo);
      const link = document.createElement("a");
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      onOpenChange(false);
    } catch {
      if (version === preparationVersion.current)
        setError("Could not prepare the RawBT receipt. The paid bill is saved; check the printer and try again.");
    } finally {
      inFlight.current = false;
      setPrinting(false);
    }
  }, [bill, footerText, isReprint, onLogReprint, onOpenChange, role]);

  useEffect(() => {
    if (!open) {
      attempted.current = false;
      reprintLogged.current = false;
      preparationVersion.current++;
      return;
    }
    if (preview) return;
    const android = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
    if (!bill || (!android && settings.isLoading) || attempted.current) return;
    const timer = window.setTimeout(() => {
      if (!attempted.current) {
        attempted.current = true;
        void (android ? printRawBt() : print());
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, bill, settings.isLoading, print, printRawBt, preview]);

  if (!bill) return null;
  const android = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  if (preview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] max-w-md flex-col overflow-hidden p-0">
          <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
            <div>
              <DialogTitle className="text-base font-bold">
                Receipt Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {bill.bill_number ?? `Bill #${bill.id}`}
              </DialogDescription>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-muted/40 p-4">
            <div ref={receipt} className="mx-auto w-fit max-w-full overflow-hidden rounded-sm bg-white shadow-md">
              <div
                className="relative"
                data-preview-raster={
                  previewRaster?.key === previewKey ? "true" : undefined
                }
              >
                <ReceiptTemplate
                  bill={bill}
                  isReprint={isReprint}
                  footer={settings.data?.receipt_footer}
                />
                {previewRaster?.key === previewKey && (
                  /* eslint-disable-next-line @next/next/no-img-element -- Exact RawBT raster preview matching thermal output. */
                  <img
                    src={previewRaster.src}
                    alt={bill.bill_number ?? `Receipt #${bill.id}`}
                    className="receipt-raster-preview"
                  />
                )}
              </div>
            </div>
          </div>
          {error && (
            <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card p-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              disabled={printing}
              onClick={() => void (android ? printRawBt() : print())}
              className="gap-2"
            >
              <Printer size={16} aria-hidden="true" />
              {printing ? "Preparing print..." : "Print"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <div ref={receipt} hidden>
        <ReceiptTemplate
          bill={bill}
          isReprint={isReprint}
          footer={settings.data?.receipt_footer}
        />
      </div>
      <Dialog open={open && !!error} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Could not print receipt</DialogTitle>
          <DialogDescription>{error}</DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button disabled={printing} onClick={() => void (android ? printRawBt() : print())}>
              Retry printing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
