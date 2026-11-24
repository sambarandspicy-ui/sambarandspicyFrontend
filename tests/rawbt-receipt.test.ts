import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import type { BillDetail } from "../src/types/domain";
import { rawBtReceiptPng, rawBtReceiptUrl } from "../src/lib/rawbt-receipt";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
const drawn: string[] = [];
let separatorCount = 0;
let scaleFactor = 1;
const context = {
  font: "", fillStyle: "", textAlign: "", textBaseline: "",
  scale: (x: number) => { scaleFactor = x; },
  measureText: (text: string) => ({ width: text.length * 8 }),
  fillRect: (_x: number, _y: number, _width: number, height: number) => { if (height === 4) separatorCount++; }, drawImage: () => {},
  save: () => {}, restore: () => {}, translate: () => {}, beginPath: () => {},
  moveTo: () => {}, bezierCurveTo: () => {}, stroke: () => {},
  fillText: (text: string) => { drawn.push(text); },
  getImageData: (_x: number, _y: number, width: number, height: number) => {
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    data[0] = data[1] = data[2] = 0;
    return { data };
  },
};
dom.window.HTMLCanvasElement.prototype.getContext = (() => context) as unknown as typeof dom.window.HTMLCanvasElement.prototype.getContext;
dom.window.HTMLCanvasElement.prototype.toDataURL = (() => "data:image/png;base64,MOCK") as unknown as typeof dom.window.HTMLCanvasElement.prototype.toDataURL;
const bill = {
  store_name_snapshot: "Sambar & Spicy", store_address_snapshot: "Chennai", store_phone_snapshot: "123",
  bill_number: "SNS-001", paid_at: "2026-11-22T10:00:00Z", cashier_name: "Cashier",
  items: [{ item_name_snapshot: "Masala Dosa", portion: "HALF", quantity: 2, unit_price: 60, line_net_total: 120 }],
  subtotal_amount: 120, discount_amount: 0, round_off_amount: -0.25, total_amount: 119.75,
  payment: { payment_method: "UPI", reference_number: "SECRET123456" },
} as unknown as BillDetail;
const url = rawBtReceiptUrl(bill, "Come again", true, {} as HTMLImageElement);
assert.match(url, /^intent:base64,.*#Intent;scheme=rawbt;package=ru\.a402d\.rawbtprinter;end$/);
const bytes = Buffer.from(url.slice("intent:base64,".length, url.indexOf("#Intent;")), "base64");
assert.deepEqual([...bytes.subarray(0, 8)], [0x1b, 0x40, 0x1d, 0x76, 0x30, 0, 48, 0]);
assert.ok(bytes.readUInt16LE(8) > 0);
assert.equal(bytes[10], 0x80);
assert.deepEqual([...bytes.subarray(-2)], [10, 10]);
assert.ok(drawn.includes("REPRINT"));
assert.ok(drawn.includes("Masala Dosa (Half)"));
assert.ok(drawn.some((text) => text.includes("119.75")));
assert.ok(drawn.includes("Round off"));
assert.ok(drawn.includes("Total quantity"));
assert.ok(drawn.includes("2"));
assert.ok(separatorCount >= 7);
assert.ok(drawn.some((text) => text.includes("****3456")));
assert.ok(drawn.includes("Qty x Rate"));
assert.ok(drawn.includes("Amount"));
assert.ok(drawn.includes("Non-GST counter receipt"));
assert.ok(!drawn.some((text) => text.includes("SECRET")));
const png = rawBtReceiptPng(bill, "Come again", true, {} as HTMLImageElement);
assert.equal(png, "data:image/png;base64,MOCK");
assert.equal(scaleFactor, 3);
dom.window.close();
console.log("RawBT receipt commands and amounts passed");
