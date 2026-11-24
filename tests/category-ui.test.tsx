/* eslint-disable @typescript-eslint/no-require-imports -- Set up JSDOM before client imports. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Event", "CustomEvent", "NodeFilter", "Node", "getComputedStyle", "MutationObserver", "File", "FileReader"] as const)
  Object.defineProperty(globalThis, name, { value: name === "window" ? dom.window : dom.window[name], configurable: true });
Object.defineProperty(globalThis, "self", { value: dom.window, configurable: true });

async function main() {
  const { render, screen, fireEvent, within, waitFor, cleanup } = await import("@testing-library/react");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { AuthProvider } = require("../src/providers/auth-provider") as typeof import("../src/providers/auth-provider");
  const { AdminWorkspace } = require("../src/components/admin/AdminWorkspace") as typeof import("../src/components/admin/AdminWorkspace");
  const { MockPosApiClient, resetDemoData } = require("../src/services/mock/mockPosApiClient") as typeof import("../src/services/mock/mockPosApiClient");
  resetDemoData();
  const api = new MockPosApiClient();
  await api.login("admin", "demo");
  const category = (await api.getCategories())[0];
  assert.ok(category.image_path);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } } });
  render(<QueryClientProvider client={client}><AuthProvider><AdminWorkspace /></AuthProvider></QueryClientProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Categories" }));
  const row = (await screen.findAllByText(category.name)).map(element => element.closest("tr")).find(Boolean)!;
  fireEvent.click(within(row).getByRole("button", { name: `Change image for ${category.name}` }));
  const photo = await screen.findByRole("dialog", { name: "Category photo" });
  fireEvent.click(within(photo).getByRole("button", { name: "Remove image" }));
  fireEvent.click(within(photo).getByRole("button", { name: "Save photo" }));
  await screen.findByText("Category photo saved.");
  assert.equal((await api.getCategories()).find(x => x.id === category.id)?.image_path, null);
  fireEvent.click(within(row).getByRole("switch", { name: `Status for ${category.name}` }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));
  await waitFor(async () => assert.equal((await api.getCategories()).find(x => x.id === category.id)?.is_active, false));
  fireEvent.click(within(row).getByRole("button", { name: `Edit ${category.name}` }));
  const edit = await screen.findByRole("dialog", { name: "Edit category" });
  assert.ok(within(edit).getByText("Category details"));
  assert.ok(within(edit).getByLabelText("Category image"));
  cleanup(); client.clear(); dom.window.close();
  console.log("Category photo, status and form controls passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
