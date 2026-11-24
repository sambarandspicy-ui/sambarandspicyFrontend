/* eslint-disable @next/next/no-img-element -- Paths can be local or user-provided and need a runtime fallback. */
"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Banknote,
  Check,
  CreditCard,
  Minus,
  Plus,
  ReceiptText,
  Trash2,
  WalletCards,
  FolderClock,
  LockKeyhole,
  PauseCircle,
  Printer,
} from "lucide-react";
import type { BillingCart } from "@/hooks/useBillingCart";
import type { Category, MenuItem, PaymentMethod } from "@/types/domain";
import { formatINR } from "@/lib/format";
const methods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: WalletCards },
  { id: "CARD", label: "Card", icon: CreditCard },
];
export function BillingCartPanel({
  cart,
  canEdit,
  heldCount,
  onHold,
  onHeld,
  onProceedToCheckout,
  menu,
  categories,
  headerActions,
  roundOffAvailable,
  roundOffLoading,
  onRetryRoundOff,
}: {
  roundOffAvailable: boolean;
  roundOffLoading: boolean;
  onRetryRoundOff: () => void;
  headerActions: ReactNode;
  cart: BillingCart;
  canEdit: boolean;
  heldCount: number;
  onHold: () => void;
  onHeld: () => void;
  onProceedToCheckout: () => void;
  menu: MenuItem[];
  categories: Category[];
}) {
  const [clearOpen, setClearOpen] = useState(false);
  return (
    <aside
      className="flex min-h-0 scroll-mt-20 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm lg:h-full"
      id="billing-cart-panel"
      aria-label="Current bill"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border p-4 [&_h2]:text-lg [&_h2]:font-bold">
        <div>
          <h2>Current Bill</h2>
          {cart.state.resumedBillId && (
            <span className="mt-2 inline-block rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700">
              Resumed:{" "}
              {cart.state.holdLabel ||
                `Held Order #${cart.state.resumedBillId}`}
            </span>
          )}
          <Button
            variant="ghost"
            className="mt-2 min-h-11 border border-orange-200 bg-orange-50 px-3 text-orange-700"
            onClick={onHeld}
          >
            <span>
              <FolderClock size={16} /> Held Bills
            </span>
            <strong>{heldCount}</strong>
          </Button>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
          {headerActions}
          {canEdit &&
            (cart.state.items.length > 0 ||
              cart.state.resumedBillId !== null) && (
              <Button
                variant="ghost"
                className="min-h-11 px-2 text-muted-foreground"
                onClick={() => setClearOpen(true)}
              >
                Clear Cart
              </Button>
            )}
        </div>
      </div>
      {!canEdit ? (
        <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground [&_h3]:font-bold [&_h3]:text-foreground">
          <span>
            <LockKeyhole size={20} />
          </span>
          <h3>Read-only access</h3>
          <p>
            You can browse the menu and inspect held bills. Billing actions are
            disabled for this account.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2 p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {cart.state.items.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center text-muted-foreground [&_strong]:text-foreground">
                <span>
                  <ReceiptText size={23} />
                </span>
                <strong>Your cart is empty</strong>
                <p>Select dishes from the menu to start a bill</p>
              </div>
            ) : (
              cart.state.items.map((item) => (
                <div
                  className="flex gap-3 rounded-xl border border-border bg-muted/60 p-3"
                  key={`${item.menuItemId}:${item.portion}`}
                >
                  <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                    {item.imagePath ? (
                      <img
                        src={item.imagePath}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/dish.svg";
                        }}
                      />
                    ) : (
                      <ReceiptText size={19} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <strong>
                        <DietaryBadge
                          type={
                            menu.find((dish) => dish.id === item.menuItemId)
                              ?.dietary_type ?? "UNSPECIFIED"
                          }
                        />{" "}
                        {item.name}
                      </strong>
                      <Button
                        variant="ghost"
                        className="size-10 shrink-0 p-0 text-muted-foreground"
                        aria-label={`Remove ${item.portion === "HALF" ? "half " : ""}${item.name}`}
                        onClick={() =>
                          cart.remove(item.menuItemId, item.portion)
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <p>
                      {item.portion === "HALF" ? "Half" : "Full"} ·{" "}
                      {formatINR(item.unitPrice)} / item
                    </p>
                    {(() => {
                      const current = menu.find(
                        (m) => m.id === item.menuItemId,
                      );
                      if (
                        !current ||
                        !current.is_available ||
                        (item.portion === "HALF" &&
                          (!current.has_half_portion ||
                            current.half_selling_price == null)) ||
                        !categories.some(
                          (c) => c.id === current.category_id && c.is_active,
                        )
                      )
                        return (
                          <p
                            className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                            role="status"
                          >
                            Unavailable now. Remove this item before checkout.
                          </p>
                        );
                      const currentPrice =
                        item.portion === "HALF"
                          ? current.half_selling_price!
                          : current.selling_price;
                      if (currentPrice !== item.unitPrice)
                        return (
                          <p
                            className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                            role="status"
                          >
                            Saved price {formatINR(item.unitPrice)}; current
                            price {formatINR(currentPrice)}. Remove and re-add
                            to use the current price.
                          </p>
                        );
                      return null;
                    })()}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-border bg-card [&_button]:size-11 [&_button]:p-0 [&_span]:min-w-6 [&_span]:text-center">
                        <Button
                          variant="ghost"
                          aria-label={`Decrease ${item.portion === "HALF" ? "half " : ""}${item.name}`}
                          onClick={() =>
                            cart.changeQuantity(
                              item.menuItemId,
                              item.portion,
                              -1,
                            )
                          }
                        >
                          <Minus size={14} />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="ghost"
                          aria-label={`Increase ${item.portion === "HALF" ? "half " : ""}${item.name}`}
                          onClick={() =>
                            cart.changeQuantity(
                              item.menuItemId,
                              item.portion,
                              1,
                            )
                          }
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <strong>
                        {formatINR(
                          (Math.round(item.unitPrice * 100) * item.quantity -
                            Math.round(item.lineDiscount * 100)) /
                            100,
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="shrink-0 border-t border-border bg-muted/70 p-4">
            <div className="space-y-2 text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-2">
              <div>
                <span>
                  Subtotal ({cart.totals.count}{" "}
                  {cart.totals.count === 1 ? "item" : "items"})
                </span>
                <strong>{formatINR(cart.totals.subtotal)}</strong>
              </div>
              {cart.totals.discount > 0 && (
                <div>
                  <span>Discount</span>
                  <strong>-{formatINR(cart.totals.discount)}</strong>
                </div>
              )}
              {cart.state.items.length > 0 && (Math.round(cart.totals.net * 100) % 100 !== 0 || cart.state.roundOff) && (
                roundOffAvailable ? (
                  <label className="flex min-h-11 items-center justify-between gap-2 text-sm font-medium">
                    <span className="flex items-center gap-2"><input type="checkbox" className="size-4 shrink-0 accent-blue-600" checked={cart.state.roundOff && cart.totals.canRound} disabled={!cart.totals.canRound} onChange={(event) => cart.setRoundOff(event.target.checked)} />Round off to nearest rupee</span>
                    {cart.state.roundOff && cart.totals.canRound && <strong className="shrink-0 tabular-nums">{cart.totals.roundOff < 0 ? "-" : "+"}{formatINR(Math.abs(cart.totals.roundOff))}</strong>}
                  </label>
                ) : (
                  <div className="flex min-h-11 items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{roundOffLoading ? "Checking round off..." : "Round off unavailable"}</span>
                    {!roundOffLoading && <Button variant="ghost" className="min-h-11 px-2 text-xs" onClick={onRetryRoundOff}>Retry</Button>}
                  </div>
                )
              )}
              <div className="border-t border-border pt-3 text-base font-bold [&_strong]:text-2xl [&_strong]:tabular-nums">
                <span>Grand Total</span>
                <strong>{formatINR(cart.totals.total)}</strong>
              </div>
            </div>
            <div className="mt-4 mb-2 text-sm font-semibold">Payment mode</div>
            <div
              className="grid grid-cols-3 gap-2"
              role="group"
              aria-label="Payment mode"
            >
              {methods.map(({ id, label, icon: Icon }) => (
                <Button
                  variant="ghost"
                  key={id}
                  className={
                    cart.state.paymentMethod === id
                      ? "min-h-11 border border-primary bg-primary/10 text-primary"
                      : "min-h-11 border border-border"
                  }
                  aria-pressed={cart.state.paymentMethod === id}
                  onClick={() => cart.setPayment(id)}
                >
                  <Icon size={17} />
                  {label}
                  {cart.state.paymentMethod === id && (
                    <Check size={13} className="size-3" />
                  )}
                </Button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_1.6fr] gap-2">
              <Button
                variant="warning"
                className="min-h-12 bg-warning px-2 text-white hover:bg-orange-700"
                disabled={!cart.state.items.length}
                onClick={onHold}
              >
                <PauseCircle size={17} aria-hidden="true" />
                Hold Bill
              </Button>
              <Button
                variant="success"
                className="min-h-12 bg-success px-2 text-white hover:bg-green-700"
                disabled={!cart.state.items.length}
                onClick={onProceedToCheckout}
              >
                <Printer size={17} aria-hidden="true" />
                Complete &amp; Print
              </Button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear current cart?"
        description="Unsaved changes to this cart will be removed. Any saved held bill remains available."
        cancelLabel="Keep cart"
        confirmLabel="Clear cart"
        destructive
        onConfirm={() => {
          cart.clear();
          setClearOpen(false);
        }}
      />
    </aside>
  );
}
