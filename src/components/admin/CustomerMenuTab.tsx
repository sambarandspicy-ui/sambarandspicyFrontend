"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Download, ExternalLink, Link2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataMode } from "@/services/api";
import QRCode from "@/vendor/qrcode";

const storageKey = "sambar-spicy-customer-menu-url";
const subscribe = () => () => {};
function browserMenuLink() {
  try { return localStorage.getItem(storageKey) || `${window.location.origin}/menu`; }
  catch { return `${window.location.origin}/menu`; }
}
function normaliseMenuUrl(value: string) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Enter a valid http or https menu link.");
  if (url.pathname === "/" || url.pathname === "") url.pathname = "/menu";
  if (url.pathname !== "/menu" && url.pathname !== "/menu/") throw new Error("The link must end in /menu.");
  url.pathname = "/menu";
  url.search = "";
  url.hash = "";
  return url.href;
}

export function CustomerMenuTab() {
  const [editedLink, setEditedLink] = useState<string | null>(null);
  const initialLink = useSyncExternalStore(subscribe, browserMenuLink, () => "");
  const link = editedLink ?? initialLink;
  const result = useMemo(() => {
    if (!link) return { url: "", matrix: null, error: "" };
    try {
      const url = normaliseMenuUrl(link);
      const qr = new QRCode(0, 0); // Medium error correction and a four-module quiet zone.
      qr.addData(url);
      qr.make();
      const size = qr.getModuleCount();
      return { url, matrix: Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => qr.isDark(row, col))), error: "" };
    } catch {
      return { url: "", matrix: null, error: "Enter a valid website address ending in /menu." };
    }
  }, [link]);
  const localOnly = (() => {
    try { return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(new URL(result.url).hostname.toLowerCase()); }
    catch { return false; }
  })();
  function changeLink(value: string) {
    setEditedLink(value);
    try { localStorage.setItem(storageKey, value); } catch {}
  }
  function download() {
    if (!result.matrix || localOnly) return;
    const matrix = result.matrix;
    const scale = Math.max(1, Math.floor(1200 / (matrix.length + 8)));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = (matrix.length + 8) * scale;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#000";
    matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) context.fillRect((x + 4) * scale, (y + 4) * scale, scale, scale); }));
    const a = document.createElement("a");
    a.download = "customer-menu-qr.png"; a.href = canvas.toDataURL("image/png"); a.click();
  }
  return <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><QrCode size={22}/></span>
        <div><h2 className="text-lg font-bold">Customer menu QR</h2><p className="mt-1 text-sm text-muted-foreground">Let guests scan and browse your available dishes on their phone.</p></div></div>
      <label htmlFor="customer-menu-url" className="mt-6 block text-sm font-semibold">Customer menu link</label>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-input bg-background px-3"><Link2 size={18} className="shrink-0 text-muted-foreground"/><input id="customer-menu-url" type="url" value={link} onChange={e=>changeLink(e.target.value)} placeholder="https://your-website.com/menu" className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Use the website address customers can reach. Print the QR and display it in your shop. If using a local network address, phones must be on the same network.</p>
      {localOnly && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This link uses localhost, which opens the customer&apos;s own phone. Enter your shop&apos;s reachable website address to download a usable QR.</p>}
      {result.error && <p role="alert" className="mt-3 text-sm text-destructive">{result.error}</p>}
      {dataMode === "mock" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Demo data is stored on each device. Use the shared backend for guests to see your actual menu.</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={download} disabled={!result.matrix || localOnly}><Download size={17}/> Download QR</Button>
        {result.url && <Button asChild variant="outline"><a href={result.url} target="_blank" rel="noreferrer"><ExternalLink size={17}/> Open menu</a></Button>}
      </div>
    </div>
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
      {/* The logo sits outside the QR quiet zone to keep the code easy to scan. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/customer-menu-logo.png" alt="Sambar & Spicy logo" className="mb-4 size-24 rounded-full border-2 border-[#c9a85b] object-cover" />
      <p className="font-bold">Scan to view the menu</p><p className="mt-1 text-xs text-muted-foreground">Your available dishes, updated regularly</p>
      <div className="mt-5 rounded-2xl border border-[#e2e8f0] bg-white p-4">
        {result.matrix ? <svg role="img" aria-label="Customer menu QR code" width="220" height="220" viewBox={`0 0 ${result.matrix.length + 8} ${result.matrix.length + 8}`} shapeRendering="crispEdges"><rect width="100%" height="100%" fill="white"/>{result.matrix.flatMap((row,y)=>row.map((dark,x)=>dark?<rect key={`${x}-${y}`} x={x+4} y={y+4} width="1" height="1" fill="black"/>:null))}</svg> : <div className="grid size-[220px] place-items-center text-slate-400"><QrCode size={70}/></div>}
      </div>
      <p className="mt-4 max-w-full break-all text-xs text-muted-foreground">{result.url || "Add your menu link above"}</p>
    </div>
  </section>;
}
