"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries";
import type { CartItem } from "@/hooks/useBillingCart";
import { round } from "@/lib/calculations";
import { getBusinessDateIST } from "@/lib/format";
import { roundBillTotal } from "@/lib/roundOff";
import type { CheckoutInput } from "@/services/api/types";
import { enqueueBill } from "@/services/offline/billingOutbox";
import { billingSyncManager } from "@/services/offline/billingSyncManager";
import { isIndexedDbAvailable } from "@/services/offline/indexedDb";
import { generateLocalBillNumber } from "@/services/offline/localBillCounter";
import { ApiError } from "@/types/api";
import type {
  BillDetail,
  BillItem,
  MenuItem,
  PortionSize,
  StoreSettings,
  User,
} from "@/types/domain";

let localSyntheticSequence = 0;

function nextSyntheticId(): number {
  localSyntheticSequence = (localSyntheticSequence + 1) % 1000;
  return -(Date.now() * 1000 + localSyntheticSequence);
}

export function buildLocalBillDetail({
  payload,
  clientBillId,
  clientBillNumber,
  clientCreatedAt,
  cartItems,
  menu,
  store,
  user,
}: {
  payload: CheckoutInput;
  clientBillId: string;
  clientBillNumber: string;
  clientCreatedAt: string;
  cartItems: CartItem[];
  menu: MenuItem[];
  store: StoreSettings | undefined;
  user: User;
}): BillDetail {
  const syntheticBillId = nextSyntheticId();
  const createdDate = new Date(clientCreatedAt);
  const businessDate = getBusinessDateIST(createdDate);

  const lines: BillItem[] = payload.items.map((line, index) => {
    const portion: PortionSize = line.portion ?? "FULL";
    const cartMatch = cartItems.find(
      (c) => c.menuItemId === line.menu_item_id && c.portion === portion,
    );
    const menuMatch = menu.find((m) => m.id === line.menu_item_id);
    const unitPrice =
      line.expected_unit_price ??
      cartMatch?.unitPrice ??
      (portion === "HALF"
        ? (menuMatch?.half_selling_price ?? menuMatch?.selling_price ?? 0)
        : (menuMatch?.selling_price ?? 0));
    const estimatedUnitCost =
      cartMatch?.estimatedUnitCost ??
      (portion === "HALF"
        ? (menuMatch?.half_estimated_unit_cost ?? null)
        : (menuMatch?.estimated_unit_cost ?? null));
    const lineDiscount = round(line.line_discount_amount ?? 0, 2);
    const lineTotal = round(unitPrice * line.quantity, 2);
    const lineNetTotal = round(lineTotal - lineDiscount, 2);
    return {
      id: -(index + 1),
      bill_id: syntheticBillId,
      menu_item_id: line.menu_item_id,
      portion,
      item_name_snapshot:
        cartMatch?.name ?? menuMatch?.name ?? `Item #${line.menu_item_id}`,
      quantity: line.quantity,
      unit_price: unitPrice,
      estimated_unit_cost_snapshot: estimatedUnitCost,
      line_discount_amount: lineDiscount,
      line_total: lineTotal,
      line_net_total: lineNetTotal,
      created_at: clientCreatedAt,
    };
  });

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotalPaise = lines.reduce(
    (sum, l) => sum + Math.round(l.line_total * 100),
    0,
  );
  const discountPaise = lines.reduce(
    (sum, l) => sum + Math.round(l.line_discount_amount * 100),
    0,
  );
  const subtotalAmount = subtotalPaise / 100;
  const discountAmount = discountPaise / 100;
  const netAmount = (subtotalPaise - discountPaise) / 100;
  const rounded = payload.round_off
    ? roundBillTotal(netAmount)
    : { total: netAmount, adjustment: 0 };

  return {
    id: syntheticBillId,
    bill_number: clientBillNumber,
    checkout_key: payload.checkout_key,
    client_bill_id: clientBillId,
    clientBillId,
    syncStatus: "PENDING",
    syncError: null,
    business_date: businessDate,
    status: "PAID",
    hold_label: payload.hold_label ?? null,
    item_count: itemCount,
    subtotal_amount: subtotalAmount,
    discount_amount: discountAmount,
    round_off_amount: rounded.adjustment,
    total_amount: rounded.total,
    note: payload.note ?? null,
    store_name_snapshot: store?.store_name ?? "Sambar & Spicy",
    store_address_snapshot: store?.address ?? "",
    store_phone_snapshot: store?.phone ?? "",
    created_by: user.id,
    paid_by: user.id,
    cancelled_by: null,
    cancel_reason: null,
    created_at: clientCreatedAt,
    held_at: null,
    paid_at: clientCreatedAt,
    cancelled_at: null,
    updated_at: clientCreatedAt,
    items: lines,
    payment: {
      id: -1,
      bill_id: syntheticBillId,
      payment_method: payload.payment_method,
      amount: rounded.total,
      tendered_amount: payload.tendered_amount,
      change_amount: round(payload.tendered_amount - rounded.total, 2),
      reference_number: payload.reference_number ?? null,
      recorded_by: user.id,
      recorded_at: clientCreatedAt,
    },
    cashier_name: user.full_name,
  };
}

export interface UseLocalFirstCheckoutOptions {
  user: User | null;
  canEdit: boolean;
  roundOffEnabled: boolean;
  cartItems: CartItem[];
  menu: MenuItem[];
  store: StoreSettings | undefined;
  fallbackCheckout: (input: CheckoutInput) => Promise<BillDetail>;
  simulatePostCheckoutFailure?: (bill: BillDetail) => void | Promise<void>;
  onCheckoutCommitted: (bill: BillDetail, options?: { print?: boolean }) => void;
}

export function useLocalFirstCheckout({
  user,
  canEdit,
  roundOffEnabled,
  cartItems,
  menu,
  store,
  fallbackCheckout,
  simulatePostCheckoutFailure,
  onCheckoutCommitted,
}: UseLocalFirstCheckoutOptions) {
  const queryClient = useQueryClient();
  const checkoutInFlight = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  async function checkout(
    input: CheckoutInput,
    options?: { print?: boolean },
  ): Promise<BillDetail> {
    if (!canEdit || !user) throw new Error("Access denied");
    if (input.round_off && !roundOffEnabled) {
      throw new ApiError(
        "ROUND_OFF_UNAVAILABLE",
        "Round off is unavailable. Refresh after updating the billing service.",
        400,
      );
    }
    if (checkoutInFlight.current) {
      throw new Error("Checkout is already in progress.");
    }
    checkoutInFlight.current = true;
    setIsSaving(true);
    try {
      const clientBillId =
        input.clientBillId ??
        (typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      const clientCreatedAt = input.clientCreatedAt ?? new Date().toISOString();

      let bill: BillDetail | null = null;
      if (isIndexedDbAvailable()) {
        try {
          const clientBillNumber =
            input.clientBillNumber ??
            (await generateLocalBillNumber(new Date(clientCreatedAt)));
          const payload: CheckoutInput = {
            ...input,
            clientBillId,
            clientBillNumber,
            clientCreatedAt,
          };
          const localBill = buildLocalBillDetail({
            payload,
            clientBillId,
            clientBillNumber,
            clientCreatedAt,
            cartItems,
            menu,
            store,
            user,
          });
          await enqueueBill({
            clientBillId,
            payload,
            localBill,
            createdAt: clientCreatedAt,
          });
          if (payload.bill_id != null) {
            queryClient.setQueryData<BillDetail[]>(
              [...queryKeys.bills, "held"],
              (old) => (old ? old.filter((held) => held.id !== payload.bill_id) : old),
            );
          }
          bill = localBill;
        } catch {
          bill = null;
        }
      }

      if (!bill) {
        bill = await fallbackCheckout(input);
      }

      if (process.env.NODE_ENV !== "production") {
        await simulatePostCheckoutFailure?.(bill);
      }

      onCheckoutCommitted(bill, options);

      if (bill.syncStatus && bill.syncStatus !== "SYNCED") {
        void billingSyncManager.syncNow();
      }
      return bill;
    } finally {
      checkoutInFlight.current = false;
      setIsSaving(false);
    }
  }

  return {
    checkout,
    isSaving,
  };
}
