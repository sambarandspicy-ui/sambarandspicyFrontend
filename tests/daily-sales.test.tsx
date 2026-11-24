/* eslint-disable @typescript-eslint/no-require-imports -- Initialize JSDOM before client imports. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import type { BillDetail } from "../src/types/domain";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "navigator", "HTMLElement", "Element", "Event", "CustomEvent", "NodeFilter", "Node", "getComputedStyle", "MutationObserver"] as const) {
  Object.defineProperty(globalThis, name, { value: name === "window" ? dom.window : dom.window[name], configurable: true });
}
Object.defineProperty(globalThis, "self", { value: dom.window, configurable: true });

async function main() {
  const { render, screen, cleanup, waitFor } = await import("@testing-library/react");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { DailySales } = require("../src/components/layout/daily-sales") as typeof import("../src/components/layout/daily-sales");
  const { api } = require("../src/services/api") as typeof import("../src/services/api");
  const { getBusinessDateIST } = require("../src/lib/format") as typeof import("../src/lib/format");
  const original = api.listBills;
  const today = getBusinessDateIST();
  let paid = 125.5;
  api.listBills = async (range) => {
    assert.deepEqual(range, { from: today, to: today });
    return [
      { status: "PAID", business_date: today, total_amount: paid },
      { status: "HELD", business_date: today, total_amount: 999 },
      { status: "CANCELLED", business_date: today, total_amount: 999 },
      { status: "PAID", business_date: "2000-01-01", total_amount: 999 },
    ] as BillDetail[];
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><DailySales /></QueryClientProvider>);
  await screen.findByText("₹125.50");
  paid = 200;
  await client.invalidateQueries({ queryKey: ["bills"] });
  await screen.findByText("₹200.00");
  api.listBills = async () => { throw new Error("offline"); };
  await client.invalidateQueries({ queryKey: ["bills"] });
  await waitFor(() => assert.ok(screen.getByText("Unavailable")));
  cleanup();
  client.clear();
  api.listBills = original;
  dom.window.close();
  console.log("Daily sales total, refresh, and error state passed");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
