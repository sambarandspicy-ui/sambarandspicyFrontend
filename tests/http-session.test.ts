import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { HttpPosApiClient } from "../src/services/api/httpPosApiClient";
import { onSessionExpired } from "../src/services/api/session";
import { ApiError } from "../src/types/api";

const dom = new JSDOM("", { url: "http://localhost" });
Object.defineProperty(globalThis, "document", {
  value: dom.window.document,
  configurable: true,
});
Object.defineProperty(globalThis, "window", {
  value: dom.window,
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: dom.window.localStorage,
  configurable: true,
});
dom.window.document.cookie = "XSRF-TOKEN=test-token";

async function main() {
  let refreshes = 0;
  let resourceCalls = 0;
  let expired = 0;
  let authenticated = false;
  const unsubscribe = onSessionExpired(() => {
    expired++;
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      assert.equal(
        (init?.headers as Record<string, string>)["X-XSRF-TOKEN"],
        "test-token",
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      authenticated = true;
      return new Response("{}", { status: 200 });
    }
    resourceCalls++;
    return authenticated
      ? new Response("[]", { status: 200 })
      : new Response("{}", { status: 401 });
  };
  const client = new HttpPosApiClient("http://localhost:8080/api/v1");
  const results = await Promise.all([
    client.getCategories(),
    client.getMenuItems(),
  ]);
  assert.deepEqual(results, [[], []]);
  assert.equal(refreshes, 1);
  assert.equal(resourceCalls, 4);
  assert.equal(expired, 0);

  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/auth/refresh")) throw new Error("offline");
    return new Response("{}", { status: 401 });
  };
  await assert.rejects(
    () => client.getCategories(),
    (error: unknown) =>
      error instanceof ApiError && error.code === "NETWORK_ERROR",
  );
  assert.equal(
    expired,
    0,
    "A temporary network failure must not end the session",
  );

  globalThis.fetch = async () => new Response("{}", { status: 401 });
  await assert.rejects(() => client.getCategories(), { status: 401 });
  assert.equal(expired, 1);

  let finishRefresh: () => void = () => {};
  let announceRefresh: () => void = () => {};
  const refreshStarted = new Promise<void>((resolve) => {
    announceRefresh = resolve;
  });
  const refreshRelease = new Promise<void>((resolve) => {
    finishRefresh = resolve;
  });
  let refreshFinished = false;
  let logoutSent = false;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      announceRefresh();
      await refreshRelease;
      refreshFinished = true;
      return new Response("{}", { status: 200 });
    }
    if (url.endsWith("/auth/logout")) {
      assert.equal(
        refreshFinished,
        true,
        "Logout must wait for an in-flight refresh",
      );
      logoutSent = true;
      return new Response(null, { status: 204 });
    }
    return refreshFinished
      ? new Response("[]", { status: 200 })
      : new Response("{}", { status: 401 });
  };
  const racingClient = new HttpPosApiClient("http://localhost:8080/api/v1");
  const pendingRequest = racingClient.getCategories();
  await refreshStarted;
  const pendingLogout = racingClient.logout();
  await Promise.resolve();
  assert.equal(logoutSent, false);
  finishRefresh();
  await Promise.all([pendingRequest, pendingLogout]);
  assert.equal(logoutSent, true);

  globalThis.fetch = async () => new Response("{}", { status: 404 });
  await assert.rejects(
    () =>
      client.checkoutBill({
        checkout_key: "test-key",
        items: [],
        payment_method: "CASH",
        tendered_amount: 0,
      }),
    { status: 404 },
    "A missing billing endpoint must never fall back to local demo sales",
  );
  dom.window.document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
  const loginCalls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    loginCalls.push(url);
    if (url.endsWith("/auth/csrf")) {
      return new Response(JSON.stringify({ token: "server-csrf" }), {
        status: 200,
      });
    }
    assert.equal(
      (init?.headers as Record<string, string>)["X-XSRF-TOKEN"],
      "server-csrf",
    );
    return new Response(
      JSON.stringify({ user: { id: 1, username: "admin" } }),
      { status: 200 },
    );
  };
  const freshClient = new HttpPosApiClient("http://localhost:8080/api/v1");
  assert.equal((await freshClient.login("admin", "password")).id, 1);
  assert.deepEqual(
    loginCalls.map((url) => url.slice(url.lastIndexOf("/auth/"))),
    ["/auth/csrf", "/auth/login"],
  );
  unsubscribe();
  dom.window.close();
  console.log("Session refresh and concurrency passed");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
