/* eslint-disable @typescript-eslint/no-require-imports -- Initialize JSDOM before client imports. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Event", "CustomEvent", "NodeFilter", "Node", "getComputedStyle", "MutationObserver"] as const) {
  Object.defineProperty(globalThis, name, { value: name === "window" ? dom.window : dom.window[name], configurable: true });
}
Object.defineProperty(globalThis, "self", { value: dom.window, configurable: true });

async function main() {
  const { render, screen, cleanup } = await import("@testing-library/react");
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { AuthProvider, useAuth } = require("../src/providers/auth-provider") as typeof import("../src/providers/auth-provider");
  const { api } = require("../src/services/api") as typeof import("../src/services/api");
  const original = api.getMe;
  let calls = 0;
  api.getMe = async () => { calls++; return null; };
  function Probe() {
    const { ready, user } = useAuth();
    return <p>{ready && !user ? "Signed out" : "Loading"}</p>;
  }
  render(<React.StrictMode><QueryClientProvider client={new QueryClient()}><AuthProvider><Probe /></AuthProvider></QueryClientProvider></React.StrictMode>);
  await screen.findByText("Signed out");
  assert.equal(calls, 1);
  cleanup();
  api.getMe = original;
  dom.window.close();
  console.log("Strict Mode session initialization passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
