/* eslint-disable @typescript-eslint/no-require-imports -- Load browser components after installing JSDOM globals. */
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "Element",
  "Event",
  "CustomEvent",
  "NodeFilter",
  "Node",
  "getComputedStyle",
  "MutationObserver",
] as const) {
  Object.defineProperty(globalThis, name, {
    value: name === "window" ? dom.window : dom.window[name],
    configurable: true,
  });
}

async function main() {
  const { render, screen, fireEvent, waitFor, cleanup, within } = await import(
    "@testing-library/react"
  );
  const { QueryClient, QueryClientProvider } = require("@tanstack/react-query") as typeof import("@tanstack/react-query");
  const { AuthProvider } = require("../src/providers/auth-provider") as typeof import("../src/providers/auth-provider");
  const { BillingWorkspace } = require("../src/components/billing/BillingWorkspace") as typeof import("../src/components/billing/BillingWorkspace");
  const { MockPosApiClient, resetDemoData } = require("../src/services/mock/mockPosApiClient") as typeof import("../src/services/mock/mockPosApiClient");

  const api = new MockPosApiClient();
  resetDemoData();
  await api.login("admin", "demo");

  const menu = await api.getMenuItems();
  const dosa = menu.find((m) => m.selling_price > 0)!;
  const paidBill = await api.checkoutBill({
    items: [
      {
        menu_item_id: dosa.id,
        portion: "FULL",
        quantity: 1,
        expected_unit_price: dosa.selling_price,
      },
    ],
    checkout_key: "11111111-1111-4111-8111-111111111111",
    payment_method: "CASH",
    tendered_amount: dosa.selling_price,
  });
  const directDeleteTarget = await api.checkoutBill({
    items: [
      {
        menu_item_id: dosa.id,
        portion: "FULL",
        quantity: 1,
        expected_unit_price: dosa.selling_price,
      },
    ],
    checkout_key: "22222222-2222-4222-8222-222222222222",
    payment_method: "UPI",
    tendered_amount: dosa.selling_price,
  });

  const mount = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
    });
    const result = render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <BillingWorkspace />
        </AuthProvider>
      </QueryClientProvider>,
    );
    return {
      dispose: () => {
        result.unmount();
        cleanup();
        client.clear();
      },
    };
  };

  // 1. READ_ONLY user cannot cancel or delete bills in Past Bills
  await api.logout();
  await api.login("viewer", "demo");
  let view = mount();
  await screen.findByRole("button", { name: "Past Bills" });
  fireEvent.click(screen.getByRole("button", { name: "Past Bills" }));
  const viewerCard = (await screen.findByText(paidBill.bill_number!)).closest("article")!;
  assert.equal(within(viewerCard).queryByRole("button", { name: "Cancel bill" }), null);
  assert.equal(within(viewerCard).queryByRole("button", { name: "Delete bill" }), null);
  view.dispose();

  // 2. ADMIN can cancel a paid bill with reason validation, then delete bills from Past Bills
  await api.logout();
  await api.login("admin", "demo");
  view = mount();
  await screen.findByRole("button", { name: "Past Bills" });
  fireEvent.click(screen.getByRole("button", { name: "Past Bills" }));

  const adminCard = (await screen.findByText(paidBill.bill_number!)).closest("article")!;
  fireEvent.click(within(adminCard).getByRole("button", { name: "Cancel bill" }));
  await screen.findByLabelText("Cancellation reason");
  const cancelDialog = screen.getByRole("dialog", { name: /^Cancel bill / });
  fireEvent.click(within(cancelDialog).getByRole("button", { name: "Cancel bill" }));
  await screen.findByText("Enter a reason for cancellation.");
  fireEvent.change(screen.getByLabelText("Cancellation reason"), {
    target: { value: "Billed wrong table" },
  });
  fireEvent.click(within(cancelDialog).getByRole("button", { name: "Cancel bill" }));

  await waitFor(async () =>
    assert.equal((await api.getBillById(paidBill.id)).status, "CANCELLED"),
  );
  assert.equal((await api.getBillById(paidBill.id)).cancel_reason, "Billed wrong table");
  assert.ok(
    !(await api.getSalesLedger({ from: null, to: null })).some(
      (row) => row.bill.id === paidBill.id,
    ),
  );
  await screen.findByText(/Reason: Billed wrong table/);

  // Delete cancelled bill via Past Bills
  fireEvent.click(
    within(screen.getByText(paidBill.bill_number!).closest("article")!).getByRole("button", {
      name: "Delete bill",
    }),
  );
  const deleteDialog1 = await screen.findByRole("dialog", { name: /^Delete bill / });
  fireEvent.click(within(deleteDialog1).getByRole("button", { name: "Delete bill" }));
  await waitFor(() => assert.ok(!screen.queryByText(paidBill.bill_number!)));
  await assert.rejects(() => api.getBillById(paidBill.id), { status: 404 });

  // Delete confirmed PAID bill directly via Past Bills
  fireEvent.click(
    within(screen.getByText(directDeleteTarget.bill_number!).closest("article")!).getByRole(
      "button",
      { name: "Delete bill" },
    ),
  );
  const deleteDialog2 = await screen.findByRole("dialog", { name: /^Delete bill / });
  fireEvent.click(within(deleteDialog2).getByRole("button", { name: "Delete bill" }));
  await waitFor(() =>
    assert.ok(!screen.queryByText(directDeleteTarget.bill_number!)),
  );
  await assert.rejects(() => api.getBillById(directDeleteTarget.id), { status: 404 });
  view.dispose();

  // 3. Cashier (BILLING) cannot delete bills (403) and can cancel their just-billed order
  await api.logout();
  await api.login("cashier", "demo");
  await assert.rejects(() => api.deleteBill(1), { status: 403 });
  view = mount();
  await screen.findByText("Counter Billing");
  fireEvent.click(screen.getByRole("button", { name: `Add ${dosa.name} to cart` }));
  fireEvent.click(screen.getByRole("button", { name: "Complete & Print" }));
  await screen.findByRole("heading", { name: "Confirm payment" });
  fireEvent.click(screen.getByRole("button", { name: "Save payment" }));
  await screen.findByText(/Payment saved/);
  const cancelLastBtn = await screen.findByRole("button", { name: /Cancel Last Bill/ });
  fireEvent.click(cancelLastBtn);
  await screen.findByLabelText("Cancellation reason");
  const cashierCancelDialog = screen.getByRole("dialog", { name: /^Cancel bill / });
  fireEvent.change(screen.getByLabelText("Cancellation reason"), {
    target: { value: "Cashier entered duplicate order" },
  });
  fireEvent.click(within(cashierCancelDialog).getByRole("button", { name: "Cancel bill" }));
  await screen.findByText(/Bill SNS-.*cancelled\./);
  await waitFor(() =>
    assert.ok(!screen.queryByRole("button", { name: /Cancel Last Bill/ })),
  );
  assert.equal(screen.queryByRole("button", { name: /Reprint Last Receipt/ }), null);
  view.dispose();

  dom.window.close();
  console.log("Paid bill cancellation and deletion passed");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
