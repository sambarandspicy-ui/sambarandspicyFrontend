"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  MapPin,
  Phone,
  Printer,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { dataMode } from "@/services/api";
import type { StoreSettings } from "@/types/domain";
import QRCode from "@/vendor/qrcode";

const storageKey = "sambar-spicy-customer-menu-url";
const LOGO_SRC = "/images/customer-menu-logo.png";
const subscribe = () => () => {};

function browserMenuLink() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && saved.trim()) {
      const trimmed = saved.trim();
      if (trimmed.endsWith("/menu")) return trimmed;
      if (trimmed.endsWith("/men")) return trimmed + "u";
      try {
        const u = new URL(trimmed);
        u.pathname = "/menu";
        return u.href;
      } catch {}
    }
    return `${window.location.origin}/menu`;
  } catch {
    return typeof window !== "undefined" ? `${window.location.origin}/menu` : "";
  }
}

function normaliseMenuUrl(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Enter a valid http or https menu link.");
  if (url.pathname === "/" || url.pathname === "") url.pathname = "/menu";
  if (url.pathname !== "/menu" && url.pathname !== "/menu/")
    throw new Error("The link must end in /menu.");
  url.pathname = "/menu";
  url.search = "";
  url.hash = "";
  return url.href;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const remaining = words.slice(consumedWords).join(" ");
  if (remaining) {
    let last = remaining;
    while (ctx.measureText(last).width > maxWidth && last.length > 3) {
      last = `${last.slice(0, -4)}...`;
    }
    lines.push(last);
  } else if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

function loadLogoImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

export function CustomerMenuTab({ settings }: { settings?: StoreSettings }) {
  const [copied, setCopied] = useState(false);
  const [busyAction, setBusyAction] = useState<"download" | "print" | null>(null);
  const cleanupPrintRef = useRef<(() => void) | null>(null);
  const link = useSyncExternalStore(subscribe, browserMenuLink, () => "");

  const result = useMemo(() => {
    if (!link) return { url: "", matrix: null, error: "" };
    try {
      const url = normaliseMenuUrl(link);
      const qr = new QRCode(0, 0);
      qr.addData(url);
      qr.make();
      const size = qr.getModuleCount();
      return {
        url,
        matrix: Array.from({ length: size }, (_, row) =>
          Array.from({ length: size }, (_, col) => qr.isDark(row, col)),
        ),
        error: "",
      };
    } catch {
      return {
        url: "",
        matrix: null,
        error: "Enter a valid website address ending in /menu.",
      };
    }
  }, [link]);

  const localOnly = (() => {
    try {
      return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(
        new URL(result.url).hostname.toLowerCase(),
      );
    } catch {
      return false;
    }
  })();

  const addressText = settings?.address?.trim() ?? "";
  const phoneText = settings?.phone?.trim() ?? "";

  async function copyLink() {
    if (!result.url) return;
    try {
      await navigator.clipboard?.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function download() {
    if (!result.matrix || busyAction) return;
    setBusyAction("download");
    try {
      const matrix = result.matrix;
      const canvas = document.createElement("canvas");
      const width = 1200;
      const height = 1620;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Crisp printable card background & subtle framing
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#c9a85b";
      ctx.lineWidth = 6;
      ctx.strokeRect(48, 48, width - 96, height - 96);

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.strokeRect(68, 68, width - 136, height - 136);

      // 1. Centered circular logo
      const logoImg = await loadLogoImage(LOGO_SRC);
      const logoSize = 200;
      const logoCx = width / 2;
      const logoCy = 200;
      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCx, logoCy, logoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          logoImg,
          logoCx - logoSize / 2,
          logoCy - logoSize / 2,
          logoSize,
          logoSize,
        );
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(logoCx, logoCy, logoSize / 2 + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#c9a85b";
      ctx.lineWidth = 5;
      ctx.stroke();

      // 2. Scan heading & subtitle
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#092b16";
      ctx.font = "700 44px Inter, Arial, sans-serif";
      ctx.fillText("Scan to view the menu", width / 2, 358);

      ctx.fillStyle = "#5c6e60";
      ctx.font = "500 28px Inter, Arial, sans-serif";
      ctx.fillText("Your available dishes, updated regularly", width / 2, 412);

      // 3. Centered high-contrast QR code
      const modules = matrix.length;
      const quiet = 4;
      const cellScale = Math.max(1, Math.floor(680 / (modules + quiet * 2)));
      const qrSize = (modules + quiet * 2) * cellScale;
      const qrX = Math.round((width - qrSize) / 2);
      const qrY = 480;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);

      ctx.fillStyle = "#000000";
      matrix.forEach((row, y) => {
        row.forEach((dark, x) => {
          if (dark) {
            ctx.fillRect(
              qrX + (x + quiet) * cellScale,
              qrY + (y + quiet) * cellScale,
              cellScale,
              cellScale,
            );
          }
        });
      });

      // 4. Location & Phone number
      let cursorY = qrY + qrSize + 86;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (addressText) {
        ctx.fillStyle = "#183223";
        ctx.font = "600 32px Inter, Arial, sans-serif";
        const addressLines = wrapCanvasLines(ctx, addressText, width - 220, 3);
        for (const line of addressLines) {
          ctx.fillText(line, width / 2, cursorY);
          cursorY += 44;
        }
        cursorY += 16;
      }

      if (phoneText) {
        ctx.fillStyle = "#092b16";
        ctx.font = "700 36px Inter, Arial, sans-serif";
        ctx.fillText(phoneText, width / 2, cursorY);
      }

      const a = document.createElement("a");
      a.download = "customer-menu-qr.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      setBusyAction(null);
    }
  }

  async function printQrCard() {
    if (!result.matrix || busyAction) return;
    setBusyAction("print");
    cleanupPrintRef.current?.();

    const iframe = document.createElement("iframe");
    iframe.title = "Customer menu QR print document";
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    let cleaned = false;
    let timeoutId: number | undefined;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      window.removeEventListener("afterprint", cleanup);
      iframe.remove();
      if (cleanupPrintRef.current === cleanup) {
        cleanupPrintRef.current = null;
      }
    };
    cleanupPrintRef.current = cleanup;

    try {
      const printWindow = iframe.contentWindow;
      const printDoc = iframe.contentDocument ?? printWindow?.document;
      if (!printWindow || !printDoc) {
        cleanup();
        return;
      }

      const modules = result.matrix.length;
      const viewBox = `0 0 ${modules + 8} ${modules + 8}`;
      const rects = result.matrix
        .flatMap((row, y) =>
          row.map((dark, x) =>
            dark
              ? `<rect x="${x + 4}" y="${y + 4}" width="1" height="1" fill="#000"/>`
              : "",
          ),
        )
        .join("");

      const absoluteLogoUrl = new URL(LOGO_SRC, window.location.origin).href;
      const locationHtml = addressText
        ? `<p class="qr-location">${escapeHtml(addressText)}</p>`
        : "";
      const phoneHtml = phoneText
        ? `<p class="qr-phone">${escapeHtml(phoneText)}</p>`
        : "";

      printDoc.open();
      printDoc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Customer Menu QR</title>
    <style>
      @page { size: auto; margin: 12mm; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #183223;
        font-family: Inter, Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .qr-card {
        width: 100%;
        max-width: 380px;
        border: 2px solid #c9a85b;
        border-radius: 24px;
        padding: 28px 24px;
        text-align: center;
        background: #ffffff;
      }
      .qr-logo {
        width: 96px;
        height: 96px;
        border-radius: 9999px;
        border: 2px solid #c9a85b;
        object-fit: cover;
        display: block;
        margin: 0 auto 16px;
      }
      .qr-title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: #092b16;
      }
      .qr-subtitle {
        margin: 4px 0 18px;
        font-size: 13px;
        color: #5c6e60;
      }
      .qr-box {
        display: inline-block;
        border: 1.5px solid #cbd5e1;
        border-radius: 18px;
        padding: 14px;
        background: #ffffff;
      }
      .qr-box svg {
        display: block;
        width: 228px;
        height: 228px;
      }
      .qr-meta {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .qr-location {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.45;
        color: #183223;
        overflow-wrap: anywhere;
      }
      .qr-phone {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.02em;
        color: #092b16;
      }
    </style>
  </head>
  <body>
    <main class="qr-card">
      <img class="qr-logo" src="${escapeHtml(absoluteLogoUrl)}" alt="Sambar &amp; Spicy logo" />
      <p class="qr-title">Scan to view the menu</p>
      <p class="qr-subtitle">Your available dishes, updated regularly</p>
      <div class="qr-box">
        <svg viewBox="${viewBox}" shape-rendering="crispEdges" role="img" aria-label="Customer menu QR code">
          <rect width="100%" height="100%" fill="#fff" />
          ${rects}
        </svg>
      </div>
      ${
        locationHtml || phoneHtml
          ? `<div class="qr-meta">${locationHtml}${phoneHtml}</div>`
          : ""
      }
    </main>
  </body>
</html>`);
      printDoc.close();

      const logoEl = printDoc.querySelector<HTMLImageElement>(".qr-logo");
      if (logoEl && !logoEl.complete) {
        if (typeof logoEl.decode === "function") {
          await Promise.race([
            logoEl.decode().catch(() => undefined),
            new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
          ]);
        } else {
          await new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, 100);
            logoEl.onload = () => {
              window.clearTimeout(timer);
              resolve();
            };
            logoEl.onerror = () => {
              window.clearTimeout(timer);
              resolve();
            };
          });
        }
      }

      window.addEventListener("afterprint", cleanup, { once: true });
      printWindow.addEventListener("afterprint", cleanup, { once: true });
      timeoutId = window.setTimeout(cleanup, 60_000);

      try {
        printWindow.focus?.();
      } catch {}
      printWindow.print();
    } catch {
      cleanup();
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <QrCode size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold">Customer menu QR</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Let guests scan and browse your available dishes on their phone.
            </p>
          </div>
        </div>
        <label htmlFor="customer-menu-url" className="mt-6 block text-sm font-semibold">
          Customer menu link
        </label>
        <div className="mt-2">
          <Input
            id="customer-menu-url"
            type="url"
            value={link}
            readOnly
            leadingIcon={<Link2 size={17} />}
            placeholder="https://your-website.com/menu"
            className="cursor-default select-all bg-muted/40 text-foreground/90"
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Print or download this QR card to display in your shop. Printing and downloading include only your logo, QR code, store location, and phone number.
        </p>
        {localOnly && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-[#ebc96f]/30 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          >
            This link uses localhost, which opens the customer&apos;s own phone. Use your shop&apos;s reachable website address before sharing printed QRs.
          </p>
        )}
        {result.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {result.error}
          </p>
        )}
        {dataMode === "mock" && (
          <p className="mt-3 rounded-xl border border-[#ebc96f]/30 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Demo data is stored on each device. Use the shared backend for guests to see your actual menu.
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Tooltip content="Download printable PNG card (logo, QR, location & phone)">
            <Button
              onClick={() => void download()}
              disabled={!result.matrix}
              loading={busyAction === "download"}
              className="min-h-11 sm:min-h-10"
            >
              <Download size={17} /> Download QR
            </Button>
          </Tooltip>
          {result.url && (
            <Tooltip content="Copy public menu URL">
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyLink()}
                className="min-h-11 sm:min-h-10"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                {copied ? "Copied link" : "Copy link"}
              </Button>
            </Tooltip>
          )}
          <Tooltip content="Print table tent card (logo, QR, location & phone)">
            <Button
              type="button"
              variant="outline"
              onClick={() => void printQrCard()}
              disabled={!result.matrix}
              loading={busyAction === "print"}
              className="min-h-11 sm:min-h-10"
            >
              <Printer size={17} /> Print QR
            </Button>
          </Tooltip>
          {result.url && (
            <Tooltip content="Preview customer menu in new tab">
              <Button asChild variant="outline" className="min-h-11 sm:min-h-10">
                <a href={result.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={17} /> Open menu
                </a>
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Clean Printable Card Preview: Logo + Scan Text + QR + Location + Phone */}
      <div className="flex min-w-0 flex-col items-center justify-center rounded-2xl border-2 border-[#c9a85b]/60 bg-white p-6 text-center text-[#183223] shadow-xs">
        {/* The logo sits outside the QR quiet zone to keep the code easy to scan. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt="Sambar & Spicy logo"
          className="mb-4 size-20 rounded-full border-2 border-[#c9a85b] object-cover sm:size-24"
        />
        <p className="text-base font-bold text-[#092b16]">Scan to view the menu</p>
        <p className="mt-1 text-xs text-[#5c6e60]">Your available dishes, updated regularly</p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          {result.matrix ? (
            <svg
              role="img"
              aria-label="Customer menu QR code"
              className="size-48 sm:size-[220px]"
              viewBox={`0 0 ${result.matrix.length + 8} ${result.matrix.length + 8}`}
              shapeRendering="crispEdges"
            >
              <rect width="100%" height="100%" fill="white" />
              {result.matrix.flatMap((row, y) =>
                row.map((dark, x) =>
                  dark ? (
                    <rect key={`${x}-${y}`} x={x + 4} y={y + 4} width="1" height="1" fill="black" />
                  ) : null,
                ),
              )}
            </svg>
          ) : (
            <div className="grid size-48 place-items-center text-slate-400 sm:size-[220px]">
              <QrCode size={70} />
            </div>
          )}
        </div>
        {(addressText || phoneText) && (
          <div className="mt-5 max-w-full space-y-1.5 px-1">
            {addressText && (
              <p className="inline-flex items-start justify-center gap-1.5 text-xs font-semibold leading-5 text-[#183223] sm:text-sm">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#b58a27]" aria-hidden="true" />
                <span className="break-words">{addressText}</span>
              </p>
            )}
            {phoneText && (
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#092b16]">
                <Phone size={14} className="shrink-0 text-[#17552f]" aria-hidden="true" />
                <span className="tabular-nums">{phoneText}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
