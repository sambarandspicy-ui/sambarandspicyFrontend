"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { rawBtReceiptUrl } from "@/lib/rawbt-receipt";
let previousPrintCleanup: (() => void) | null = null;

export function ReceiptDialog({
  bill,
  open,
  onOpenChange,
  isReprint,
  role,
  onLogReprint,
}: {
  bill: BillDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isReprint: boolean;
  role: UserRole;
  onLogReprint: (id: number) => Promise<void>;
}) {
  const settings = useStoreSettings(open);
  const receipt = useRef<HTMLDivElement>(null);
  const attempted = useRef(false);
  const inFlight = useRef(false);
  const reprintLogged = useRef(false);
  const preparationVersion = useRef(0);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

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
      if (isReprint && role !== "READ_ONLY" && !reprintLogged.current) {
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
              if (logo) await logo.decode();
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
  }, [bill, isReprint, onLogReprint, onOpenChange, role]);

  const printRawBt = useCallback(async () => {
    if (!bill || inFlight.current) return;
    const version = ++preparationVersion.current;
    inFlight.current = true;
    setPrinting(true);
    setError("");
    try {
      const logo = new Image();
      logo.src = "/images/receipt-logo.png";
      const logReprint = isReprint && role !== "READ_ONLY" && !reprintLogged.current
        ? onLogReprint(bill.id).then(() => { reprintLogged.current = true; })
        : Promise.resolve();
      await Promise.all([logo.decode(), logReprint]);
      if (version !== preparationVersion.current) return;
      const footer = settings.data ? settings.data.receipt_footer : "Thank you for visiting! Come again.";
      const url = rawBtReceiptUrl(bill, footer, isReprint, logo);
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
  }, [bill, isReprint, onLogReprint, onOpenChange, role, settings.data]);

  useEffect(() => {
    if (!open) {
      attempted.current = false;
      reprintLogged.current = false;
      preparationVersion.current++;
      return;
    }
    const android = /Android/i.test(navigator.userAgent);
    if (!bill || (!android && settings.isLoading) || attempted.current) return;
    const timer = window.setTimeout(() => {
      if (!attempted.current) {
        attempted.current = true;
        void (android ? printRawBt() : print());
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, bill, settings.isLoading, print, printRawBt]);

  if (!bill) return null;
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
            <Button disabled={printing} onClick={() => void (/Android/i.test(navigator.userAgent) ? printRawBt() : print())}>
              Retry printing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
