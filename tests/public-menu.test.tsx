/* eslint-disable @typescript-eslint/no-require-imports -- Initialize JSDOM before importing client components. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Event", "CustomEvent", "NodeFilter", "Node", "getComputedStyle", "MutationObserver"] as const)
  Object.defineProperty(globalThis, name, { value: name === "window" ? dom.window : dom.window[name], configurable: true });

async function main() {
  const { render, screen, fireEvent, cleanup } = await import("@testing-library/react");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { CustomerMenu } = require("../src/components/public-menu/CustomerMenu") as typeof import("../src/components/public-menu/CustomerMenu");
  const { MockPosApiClient, resetDemoData } = require("../src/services/mock/mockPosApiClient") as typeof import("../src/services/mock/mockPosApiClient");
  const { api } = require("../src/services/api") as typeof import("../src/services/api");
  const { HttpPosApiClient } = require("../src/services/api/httpPosApiClient") as typeof import("../src/services/api/httpPosApiClient");
  const { ApiError } = require("../src/types/api") as typeof import("../src/types/api");
  let fullscreenElement: Element | null = null;
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fullscreenElement });
  Object.defineProperty(document.documentElement, "requestFullscreen", { configurable: true, value: async () => {
    fullscreenElement = document.documentElement;
    document.dispatchEvent(new dom.window.Event("fullscreenchange"));
  } });
  Object.defineProperty(document, "exitFullscreen", { configurable: true, value: async () => {
    fullscreenElement = null;
    document.dispatchEvent(new dom.window.Event("fullscreenchange"));
  } });
  resetDemoData();
  const mock = new MockPosApiClient();
  const publicMenu = await mock.getPublicMenu();
  assert.ok(publicMenu.items.length > 0, "guests can read the demo menu without signing in");
  assert.ok(publicMenu.items.every(item => !("estimated_unit_cost" in item) && !("sku" in item)));
  await mock.login("admin", "demo");
  const hidden = publicMenu.items[0];
  await mock.updateMenuItem(hidden.id, { is_available: false });
  assert.ok(!(await mock.getPublicMenu()).items.some(item => item.id === hidden.id));
  await mock.logout();
  api.getPublicMenu = () => mock.getPublicMenu();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><CustomerMenu /></QueryClientProvider>);
  await screen.findByRole("heading", { name: "Find your favourite" });
  await screen.findByRole("button", { name: "All dishes" });
  if (publicMenu.store.address?.trim()) {
    const mapLink = screen.getByRole("link", { name: new RegExp(publicMenu.store.address.trim()) });
    assert.ok(mapLink.getAttribute("href")?.startsWith("https://www.google.com/maps/search/?api=1&query="));
    assert.equal(mapLink.getAttribute("target"), "_blank");
  }
  if (publicMenu.store.phone) {
    const phoneEl = screen.getByText(publicMenu.store.phone);
    assert.ok(phoneEl.tagName === "STRONG" || phoneEl.className.includes("font-bold"));
  }
  fireEvent.click(screen.getByRole("button", { name: "View full screen" }));
  await screen.findByRole("button", { name: "Exit full screen" });
  fireEvent.click(screen.getByRole("button", { name: "Exit full screen" }));
  await screen.findByRole("button", { name: "View full screen" });
  assert.equal(screen.queryByText(hidden.name), null);
  fireEvent.change(screen.getByLabelText("Search dishes"), { target: { value: "a dish that does not exist" } });
  await screen.findByText("No dishes found");
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  assert.equal(screen.queryByText("No dishes found"), null);
  assert.equal(screen.queryByRole("button", { name: /add to cart|checkout/i }), null);
  const visibleDish = publicMenu.items.find(item => item.id !== hidden.id)!;
  await screen.findByText(visibleDish.name);
  const initialHistoryLength = dom.window.history.length;
  fireEvent.click(screen.getByRole("button", { name: new RegExp(visibleDish.name) }));
  const detailDialog = await screen.findByRole("dialog");
  assert.ok(detailDialog.textContent?.includes(visibleDish.name));
  if (visibleDish.description) assert.ok(detailDialog.textContent?.includes(visibleDish.description));
  assert.equal(dom.window.history.length, initialHistoryLength + 1, "opening dish modal pushes a history entry");
  dom.window.history.back();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(screen.queryByRole("dialog"), null, "browser back button closes dish modal without leaving the page");
  assert.equal(dom.window.location.href, "http://localhost/", "back button stays on the menu page");

  fireEvent.click(screen.getByRole("button", { name: new RegExp(visibleDish.name) }));
  await screen.findByRole("dialog");
  const closeButton = screen.getByRole("button", { name: "Close" });
  assert.ok(closeButton.className.includes("bg-white"), "close button has high-contrast backing over dish image");
  fireEvent.click(closeButton);
  assert.equal(screen.queryByRole("dialog"), null);
  await new Promise(resolve => setTimeout(resolve, 50));
  localStorage.removeItem("sambar-spicy-public-menu-v1:mock");
  api.getPublicMenu = async () => { throw new Error("offline"); };
  await client.invalidateQueries({ queryKey: ["public-menu"] });
  await screen.findByText(/Showing the last loaded menu/);
  assert.ok(screen.getByText(visibleDish.name), "a failed refresh must not hide the already displayed dishes");
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  await assert.rejects(new HttpPosApiClient("/api/v1").getPublicMenu(),
    (error: unknown) => error instanceof ApiError && error.code === "PUBLIC_MENU_UNAVAILABLE" && error.status === 503);
  cleanup(); client.clear(); dom.window.close();
  console.log("Public menu guest access and filters passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
