"use client";
import { useReducer } from "react";
import type {
  BillDetail,
  MenuItem,
  PaymentMethod,
  PortionSize,
} from "@/types/domain";
import { roundBillTotal } from "@/lib/roundOff";

export interface CartItem {
  menuItemId: number;
  portion: PortionSize;
  name: string;
  imagePath: string | null;
  unitPrice: number;
  estimatedUnitCost: number | null;
  quantity: number;
  lineDiscount: number;
}
export interface CartState {
  items: CartItem[];
  resumedBillId: number | null;
  holdLabel: string;
  note: string;
  paymentMethod: PaymentMethod;
  roundOff: boolean;
  checkoutKey: string | null;
}
export const emptyCart: CartState = {
  items: [],
  resumedBillId: null,
  holdLabel: "",
  note: "",
  paymentMethod: "CASH",
  roundOff: false,
  checkoutKey: null,
};
type Action =
  | { type: "add"; item: MenuItem; portion: PortionSize; key: string }
  | { type: "quantity"; id: number; portion: PortionSize; delta: number }
  | { type: "remove"; id: number; portion: PortionSize }
  | { type: "clear" }
  | { type: "payment"; method: PaymentMethod }
  | { type: "roundOff"; enabled: boolean }
  | { type: "resume"; bill: BillDetail; menu: MenuItem[]; key: string };
export function cartReducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add": {
      if (
        action.portion === "HALF" &&
        (!action.item.has_half_portion ||
          action.item.half_selling_price == null)
      )
        return state;
      const found = state.items.find(
        (x) => x.menuItemId === action.item.id && x.portion === action.portion,
      );
      return {
        ...state,
        checkoutKey: state.checkoutKey ?? action.key,
        items: found
          ? state.items.map((x) =>
              x === found ? { ...x, quantity: x.quantity + 1 } : x,
            )
          : [
              ...state.items,
              {
                menuItemId: action.item.id,
                portion: action.portion,
                name: action.item.name,
                imagePath: action.item.image_path,
                unitPrice:
                  action.portion === "HALF"
                    ? action.item.half_selling_price!
                    : action.item.selling_price,
                estimatedUnitCost:
                  action.portion === "HALF"
                    ? (action.item.half_estimated_unit_cost ?? null)
                    : action.item.estimated_unit_cost,
                quantity: 1,
                lineDiscount: 0,
              },
            ],
      };
    }
    case "quantity": {
      const items = state.items
        .map((x) =>
          x.menuItemId === action.id && x.portion === action.portion
            ? {
                ...x,
                quantity: x.quantity + action.delta,
                lineDiscount: Math.min(
                  x.lineDiscount,
                  Math.max(0, x.quantity + action.delta) * x.unitPrice,
                ),
              }
            : x,
        )
        .filter((x) => x.quantity > 0);
      return items.length || state.resumedBillId !== null
        ? { ...state, items }
        : emptyCart;
    }
    case "remove": {
      const items = state.items.filter(
        (x) => x.menuItemId !== action.id || x.portion !== action.portion,
      );
      return items.length || state.resumedBillId !== null
        ? { ...state, items }
        : emptyCart;
    }
    case "clear":
      return emptyCart;
    case "payment":
      return { ...state, paymentMethod: action.method };
    case "roundOff":
      return { ...state, roundOff: action.enabled };
    case "resume":
      return {
        items: action.bill.items.map((x) => ({
          menuItemId: x.menu_item_id,
          portion: x.portion ?? "FULL",
          name: x.item_name_snapshot,
          imagePath:
            action.menu.find((m) => m.id === x.menu_item_id)?.image_path ??
            null,
          unitPrice: x.unit_price,
          estimatedUnitCost: x.estimated_unit_cost_snapshot,
          quantity: x.quantity,
          lineDiscount: x.line_discount_amount,
        })),
        resumedBillId: action.bill.id,
        holdLabel: action.bill.hold_label ?? "",
        note: action.bill.note ?? "",
        paymentMethod: "CASH",
        roundOff: false,
        checkoutKey: action.key,
      };
  }
}
export function cartTotals(items: CartItem[], roundOff = false) {
  const count = items.reduce((n, x) => n + x.quantity, 0);
  const subtotal = items.reduce(
    (n, x) => n + Math.round(x.unitPrice * 100) * x.quantity,
    0,
  );
  const discount = items.reduce(
    (n, x) => n + Math.round(x.lineDiscount * 100),
    0,
  );
  const net = (subtotal - discount) / 100;
  const rounded = roundBillTotal(net);
  const canRound = rounded.total > 0;
  return {
    count,
    subtotal: subtotal / 100,
    discount: discount / 100,
    net,
    roundOff: roundOff && canRound ? rounded.adjustment : 0,
    total: roundOff && canRound ? rounded.total : net,
    canRound,
  };
}
export function useBillingCart(canEdit: boolean) {
  const [state, dispatch] = useReducer(cartReducer, emptyCart);
  return {
    state,
    totals: cartTotals(state.items, state.roundOff),
    add: (item: MenuItem, portion: PortionSize = "FULL") => {
      if (canEdit)
        dispatch({ type: "add", item, portion, key: crypto.randomUUID() });
    },
    changeQuantity: (id: number, portion: PortionSize, delta: number) => {
      if (canEdit) dispatch({ type: "quantity", id, portion, delta });
    },
    remove: (id: number, portion: PortionSize) => {
      if (canEdit) dispatch({ type: "remove", id, portion });
    },
    clear: () => {
      if (canEdit) dispatch({ type: "clear" });
    },
    setPayment: (method: PaymentMethod) => {
      if (canEdit) dispatch({ type: "payment", method });
    },
    setRoundOff: (enabled: boolean) => {
      if (canEdit) dispatch({ type: "roundOff", enabled });
    },
    resume: (bill: BillDetail, menu: MenuItem[]) => {
      if (canEdit)
        dispatch({ type: "resume", bill, menu, key: crypto.randomUUID() });
    },
  };
}
export type BillingCart = ReturnType<typeof useBillingCart>;
