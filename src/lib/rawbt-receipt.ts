import type { BillDetail } from "@/types/domain";
import { formatINR } from "@/lib/format";
import { maskReference } from "@/components/billing/ReceiptTemplate";

// Render text to a monochrome ESC/POS raster so INR and the shop font do not
// depend on the printer's built-in character set.
function renderReceiptCanvas(
  bill: BillDetail,
  footer: string | null | undefined,
  reprint: boolean,
  logoImage: HTMLImageElement,
  scale = 1,
) {
  const width = 384, margin = 12, contentWidth = width - margin * 2;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") ?? (() => { throw new Error("Image printing is not supported on this device."); })();
  const operations: Array<() => void> = [];
  let y = 12;
  function line(text: string, options: { size?: number; bold?: boolean; align?: CanvasTextAlign; font?: string; max?: number } = {}) {
    // Previous default receipt font size: 18px.
    const size = options.size ?? 20;
    const font = `${options.bold ? "bold " : ""}${size}px ${options.font ?? "Arial, sans-serif"}`;
    ctx.font = font;
    const limit = options.max ?? contentWidth;
    const lines: string[] = [];
    for (const word of (text || " ").split(/\s+/)) {
      const candidate = lines.length ? lines[lines.length - 1] + " " + word : word;
      if (lines.length && ctx.measureText(candidate).width > limit) lines.push(word);
      else if (lines.length) lines[lines.length - 1] = candidate;
      else lines.push(word);
    }
    const top = y;
    y += lines.length * (size + 5);
    operations.push(() => {
      ctx.font = font;
      ctx.textAlign = options.align ?? "left";
      ctx.textBaseline = "top";
      const x = options.align === "center" ? width / 2 : options.align === "right" ? width - margin : margin;
      lines.forEach((value, i) => ctx.fillText(value, x, top + i * (size + 5), limit));
    });
  }
  function rule() {
    const top = y + 3; y += 14;
    operations.push(() => { ctx.fillStyle = "black"; ctx.fillRect(margin, top, contentWidth, 4); });
  }
  function tableRow(name: string, quantity: string, amount: string, header = false) {
    // Previous item font size: 15px.
    const size = 17, step = 22, nameWidth = 151, quantityWidth = 112, amountWidth = 87;
    ctx.font = `${header ? "bold " : ""}${size}px Arial, sans-serif`;
    const names: string[] = [];
    for (const word of name.split(/\s+/)) {
      const candidate = names.length ? names[names.length - 1] + " " + word : word;
      if (names.length && ctx.measureText(candidate).width > nameWidth) names.push(word);
      else if (names.length) names[names.length - 1] = candidate;
      else names.push(word);
    }
    const top = y;
    y += Math.max(1, names.length) * step + 3;
    operations.push(() => {
      ctx.font = `${header ? "bold " : ""}${size}px Arial, sans-serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      names.forEach((part, i) => ctx.fillText(part, margin, top + i * step, nameWidth));
      ctx.textAlign = "right";
      ctx.fillText(quantity, margin + nameWidth + quantityWidth, top, quantityWidth - 4);
      ctx.fillText(amount, width - margin, top, amountWidth);
    });
  }
  // Previous totals font size: 18px.
  function totalRow(label: string, value: string, size = 20) {
    const top = y;
    y += size + 7;
    operations.push(() => {
      ctx.font = `bold ${size}px Arial, sans-serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(label, margin, top, contentWidth / 2);
      ctx.textAlign = "right";
      ctx.fillText(value, width - margin, top, contentWidth / 2);
    });
  }
  if (reprint) line("REPRINT", { align: "center", bold: true });
  // Previous store-name heading: line(bill.store_name_snapshot ?? "", { align: "center", bold: true, size: 42, font: '"Receipt Lobster", cursive' });
  const logoTop = y;
  const logoSize = 260;
  y += logoSize + 5;
  operations.push(() => ctx.drawImage(logoImage, (width - logoSize) / 2, logoTop, logoSize, logoSize));
  if (bill.store_address_snapshot) line(bill.store_address_snapshot, { align: "center", size: 17, bold: true });
  if (bill.store_phone_snapshot) line(`☎ ${bill.store_phone_snapshot}`, { align: "center", size: 17, bold: true });
  rule();
  line(`Bill No: ${bill.bill_number ?? ""}`);
  if (bill.paid_at) {
    const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(bill.paid_at) ? bill.paid_at : `${bill.paid_at}Z`;
    line(`Date: ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp))} IST`);
  }
  line(`Cashier: ${bill.cashier_name ?? `User #${bill.paid_by ?? bill.created_by}`}`);
  rule();
  tableRow("Item", "Qty x Rate", "Amount", true);
  rule();
  for (const item of bill.items) {
    tableRow(item.item_name_snapshot + (item.portion === "HALF" ? " (Half)" : ""), `${item.quantity} x ${formatINR(item.unit_price)}`, formatINR(item.line_net_total));
  }
  rule();
  totalRow("Total quantity", String(bill.items.reduce((sum, item) => sum + Number(item.quantity), 0)));
  totalRow("Subtotal", formatINR(bill.subtotal_amount));
  if (bill.discount_amount > 0) totalRow("Discount", `-${formatINR(bill.discount_amount)}`);
  if (bill.round_off_amount) totalRow("Round off", `${bill.round_off_amount < 0 ? "-" : "+"}${formatINR(Math.abs(bill.round_off_amount))}`);
  rule();
  totalRow("TOTAL", formatINR(bill.total_amount), 25);
  rule();
  if (bill.payment) {
    const payment = bill.payment;
    if (payment.payment_method === "CASH") {
      line(`Payment: CASH | Tendered: ${formatINR(payment.tendered_amount)}`, { bold: true });
      line(`Change: ${formatINR(payment.change_amount)}`, { bold: true });
    } else line(`Payment: ${payment.payment_method}${payment.reference_number ? ` | Ref: ${maskReference(payment.reference_number)}` : ""}`, { bold: true });
  }
  rule();
  line("Non-GST counter receipt", { align: "center", bold: true });
  if (footer) line(footer, { align: "center", bold: true });
  line("**************************", { align: "center", bold: true });
  y += 8;
  // Large Android intents can be rejected by the OS; leave the browser-print fallback available.
  if (y > 8000) throw new Error("This receipt is too long for RawBT. Use browser printing instead.");
  canvas.width = width * scale;
  canvas.height = y * scale;
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.fillStyle = "black";
  operations.forEach((draw) => draw());
  return { canvas, ctx, width, height: y };
}

export function rawBtReceiptPng(
  bill: BillDetail,
  footer: string | null | undefined,
  reprint: boolean,
  logoImage: HTMLImageElement,
): string {
  const { canvas } = renderReceiptCanvas(bill, footer, reprint, logoImage, 3);
  return canvas.toDataURL("image/png");
}

export function rawBtReceiptUrl(bill: BillDetail, footer: string | null | undefined, reprint: boolean, logoImage: HTMLImageElement): string {
  const { ctx, width, height: y } = renderReceiptCanvas(bill, footer, reprint, logoImage, 1);
  const rgba = ctx.getImageData(0, 0, width, y).data;
  const bytesPerRow = width / 8;
  const bytes = new Uint8Array(2 + 8 + bytesPerRow * y + 2);
  // Initialize the printer, then GS v 0 at normal density and two line feeds.
  bytes.set([0x1b, 0x40, 0x1d, 0x76, 0x30, 0, bytesPerRow, 0, y & 255, y >> 8]);
  for (let row = 0; row < y; row++) for (let x = 0; x < width; x++) {
    const i = (row * width + x) * 4;
    if (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114 < 160000) bytes[10 + row * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
  }
  bytes.set([10, 10], bytes.length - 2);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `intent:base64,${btoa(binary)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`;
}
