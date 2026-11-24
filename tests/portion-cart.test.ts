import assert from "node:assert/strict";
import {
  cartReducer,
  cartTotals,
  emptyCart,
} from "../src/hooks/useBillingCart";
import type { MenuItem } from "../src/types/domain";

const dish: MenuItem = {
  id: 1,
  category_id: 1,
  sku: null,
  name: "Dosa",
  description: null,
  dietary_type: "VEG",
  selling_price: 100,
  has_half_portion: true,
  half_selling_price: 60,
  estimated_unit_cost: 40,
  half_estimated_unit_cost: 20,
  image_path: null,
  sort_order: 0,
  is_available: true,
  created_at: "",
  updated_at: "",
};
let cart = cartReducer(emptyCart, {
  type: "add",
  item: dish,
  portion: "FULL",
  key: "key",
});
cart = cartReducer(cart, {
  type: "add",
  item: dish,
  portion: "HALF",
  key: "key",
});
cart = cartReducer(cart, {
  type: "add",
  item: dish,
  portion: "HALF",
  key: "key",
});
assert.equal(cart.items.length, 2);
assert.equal(cartTotals(cart.items).total, 220);
cart = cartReducer(cart, {
  type: "quantity",
  id: 1,
  portion: "HALF",
  delta: -1,
});
assert.equal(cartTotals(cart.items).total, 160);
cart = cartReducer(cart, { type: "remove", id: 1, portion: "FULL" });
assert.equal(cart.items[0].portion, "HALF");
assert.equal(
  cartReducer(emptyCart, {
    type: "add",
    item: { ...dish, has_half_portion: false },
    portion: "HALF",
    key: "key",
  }).items.length,
  0,
);
console.log("Portion cart passed");
