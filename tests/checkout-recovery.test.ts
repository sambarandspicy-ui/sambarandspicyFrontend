import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { HttpPosApiClient } from "../src/services/api/httpPosApiClient";
import { ApiError } from "../src/types/api";

const dom = new JSDOM("", { url: "http://localhost" });
Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
dom.window.document.cookie = "XSRF-TOKEN=test";
const input = { checkout_key: "e067f138-0464-496c-8805-ea3a16363370", items: [], payment_method: "CASH" as const, tendered_amount: 100 };

async function main() {
  const calls: RequestInit[] = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(init ?? {});
    if (calls.length === 1) throw new TypeError("connection dropped after payment");
    return new Response(JSON.stringify({ id: 1, status: "PAID" }), { status: 200 });
  };
  const api = new HttpPosApiClient("/api/v1");
  assert.equal((await api.checkoutBill(input)).status, "PAID");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body, "retry must use the identical payment request");
  assert.equal((calls[0].headers as Record<string, string>)["Idempotency-Key"], input.checkout_key);
  assert.equal((calls[1].headers as Record<string, string>)["Idempotency-Key"], input.checkout_key);

  calls.length = 0;
  globalThis.fetch = async (_url, init) => {
    calls.push(init ?? {});
    return new Response(JSON.stringify({ message: "Dish price changed" }), { status: 409 });
  };
  await assert.rejects(api.checkoutBill(input), (error: unknown) => error instanceof ApiError && error.status === 409);
  assert.equal(calls.length, 1, "a confirmed rejection must not be retried");

  calls.length = 0;
  globalThis.fetch = async (_url, init) => { calls.push(init ?? {}); throw new TypeError("offline"); };
  await assert.rejects(api.checkoutBill(input), (error: unknown) => error instanceof ApiError && error.status === 0);
  assert.equal(calls.length, 2, "recovery must stop after one automatic retry");

  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
    originalSetTimeout(handler, delay === 12_000 ? 5 : delay, ...args)) as typeof setTimeout;
  calls.length = 0;
  globalThis.fetch = async (_url, init) => {
    calls.push(init ?? {});
    return new Promise<Response>(() => {});
  };
  try {
    await assert.rejects(api.checkoutBill(input), (error: unknown) => error instanceof ApiError && error.status === 0);
    assert.equal(calls.length, 2, "a stalled response should time out and retry only once");
    assert.ok(calls.every(call => call.signal?.aborted), "timed-out checkout requests should be aborted");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
  dom.window.close();
  console.log("Checkout response-loss recovery passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
