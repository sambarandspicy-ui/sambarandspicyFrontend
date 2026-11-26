/* eslint-disable @next/next/no-img-element -- Paths can be local or user-provided and need a runtime fallback. */
"use client";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  FolderClock,
  LockKeyhole,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  WalletCards,
} from "lucide-react";
import type { BillingCart } from "@/hooks/useBillingCart";
import type { Category, MenuItem, PaymentMethod } from "@/types/domain";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  inSheet = false,
  onCloseSheet,
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
  inSheet?: boolean;
  onCloseSheet?: () => void;
}) {
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden bg-card text-card-foreground",
        inSheet
          ? "min-h-0 flex-1"
          : "h-full rounded-2xl border border-border shadow-[0_4px_20px_rgba(16,59,32,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.28)]",
      )}
      id={inSheet ? undefined : "billing-cart-panel"}
      aria-label="Current bill"
    >
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border p-4 [&_h2]:text-lg [&_h2]:font-bold",
          inSheet && "pr-14",
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {inSheet && onCloseSheet ? (
              <Button
                variant="outline"
                size="sm"
                className="min-h-9 shrink-0 gap-1.5 px-2.5"
                onClick={onCloseSheet}
                aria-label="Back to menu"
              >
                <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold">Menu</span>
              </Button>
            ) : null}
            <h2>Current Bill</h2>
          </div>
          {cart.state.resumedBillId && (
            <span className="mt-1.5 inline-block rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary dark:border-[#ebc96f]/30 dark:text-[#ebc96f]">
              Resumed:{" "}
              {cart.state.holdLabel || `Held Order #${cart.state.resumedBillId}`}
            </span>
          )}
          <div className="mt-2">
            <Button
              variant="subtle"
              size="sm"
              className="min-h-10 gap-1.5 border border-[#b58a27]/35 px-3"
              onClick={onHeld}
            >
              <FolderClock size={15} aria-hidden="true" />
              <span>Held Bills</span>
              <strong className="rounded-md bg-black/10 px-1.5 py-0.5 text-xs tabular-nums dark:bg-white/10">
                {heldCount}
              </strong>
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
          {headerActions}
          {canEdit &&
            (cart.state.items.length > 0 || cart.state.resumedBillId !== null) && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-10 px-2.5 text-muted-foreground"
                onClick={() => setClearOpen(true)}
              >
                Clear Cart
              </Button>
            )}
        </div>
      </div>

      {!canEdit ? (
        <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground [&_h3]:font-bold [&_h3]:text-foreground">
          <LockKeyhole size={20} aria-hidden="true" />
          <h3>Read-only access</h3>
          <p className="text-sm">
            You can browse the menu and inspect held bills. Billing actions are
            disabled for this account.
          </p>
        </div>
      ) : (
        <>
          <div className="pos-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {cart.state.items.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center text-muted-foreground [&_strong]:text-foreground">
                <ReceiptText size={24} aria-hidden="true" />
                <strong>Your cart is empty</strong>
                <p className="text-sm">Select dishes from the menu to start a bill</p>
              </div>
            ) : (
              cart.state.items.map((item) => (
                <div
                  className="flex gap-3 rounded-xl border border-border bg-muted/50 p-3"
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
                      <ReceiptText size={19} aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="flex min-w-0 items-center gap-1.5 leading-snug">
                        <DietaryBadge
                          type={
                            menu.find((dish) => dish.id === item.menuItemId)
                              ?.dietary_type ?? "UNSPECIFIED"
                          }
                        />
                        <span className="break-words">{item.name}</span>
                      </strong>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${item.portion === "HALF" ? "half " : ""}${item.name}`}
                        onClick={() => cart.remove(item.menuItemId, item.portion)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.portion === "HALF" ? "Half" : "Full"} ·{" "}
                      {formatINR(item.unitPrice)} / item
                    </p>
                    {(() => {
                      const current = menu.find((m) => m.id === item.menuItemId);
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
                            className="my-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
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
                            className="my-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
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
                      <div className="flex items-center rounded-xl border border-border bg-card [&_button]:size-9 [&_button]:p-0 [&_span]:min-w-7 [&_span]:text-center [&_span]:font-semibold">
                        <Button
                          variant="ghost"
                          aria-label={`Decrease ${item.portion === "HALF" ? "half " : ""}${item.name}`}
                          onClick={() =>
                            cart.changeQuantity(item.menuItemId, item.portion, -1)
                          }
                        >
                          <Minus size={14} aria-hidden="true" />
                        </Button>
                        <span className="tabular-nums">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          aria-label={`Increase ${item.portion === "HALF" ? "half " : ""}${item.name}`}
                          onClick={() =>
                            cart.changeQuantity(item.menuItemId, item.portion, 1)
                          }
                        >
                          <Plus size={14} aria-hidden="true" />
                        </Button>
                      </div>
                      <strong className="tabular-nums text-foreground">
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

          <div className="shrink-0 border-t border-border bg-secondary/70 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-muted/60">
            <div className="space-y-2 text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-2">
              <div>
                <span className="text-muted-foreground">
                  Subtotal ({cart.totals.count}{" "}
                  {cart.totals.count === 1 ? "item" : "items"})
                </span>
                <strong className="tabular-nums">
                  {formatINR(cart.totals.subtotal)}
                </strong>
              </div>
              {cart.totals.discount > 0 && (
                <div>
                  <span className="text-muted-foreground">Discount</span>
                  <strong className="tabular-nums">
                    -{formatINR(cart.totals.discount)}
                  </strong>
                </div>
              )}
              {cart.state.items.length > 0 &&
                (Math.round(cart.totals.net * 100) % 100 !== 0 ||
                  cart.state.roundOff) &&
                (roundOffAvailable ? (
                  <label className="flex min-h-10 items-center justify-between gap-2 text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <Input
                        type="checkbox"
                        checked={cart.state.roundOff && cart.totals.canRound}
                        disabled={!cart.totals.canRound}
                        onChange={(event) => cart.setRoundOff(event.target.checked)}
                      />
                      Round off to nearest rupee
                    </span>
                    {cart.state.roundOff && cart.totals.canRound && (
                      <strong className="shrink-0 tabular-nums">
                        {cart.totals.roundOff < 0 ? "-" : "+"}
                        {formatINR(Math.abs(cart.totals.roundOff))}
                      </strong>
                    )}
                  </label>
                ) : (
                  <div className="flex min-h-10 items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {roundOffLoading
                        ? "Checking round off..."
                        : "Round off unavailable"}
                    </span>
                    {!roundOffLoading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-xs"
                        onClick={onRetryRoundOff}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                ))}
              <div className="border-t border-border pt-3 text-base font-bold [&_strong]:text-2xl [&_strong]:tabular-nums">
                <span>Grand Total</span>
                <strong className="text-primary dark:text-[#ebc96f]">
                  {formatINR(cart.totals.total)}
                </strong>
              </div>
            </div>

            <div className="mt-3.5 mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Payment mode
            </div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment mode">
              {methods.map(({ id, label, icon: Icon }) => {
                const selected = cart.state.paymentMethod === id;
                return (
                  <Button
                    variant="outline"
                    key={id}
                    size="default"
                    className={cn(
                      "px-2",
                      selected &&
                        "border-primary bg-primary/10 text-primary ring-1 ring-[#b58a27]/40 dark:bg-primary/25 dark:text-[#ebc96f]",
                    )}
                    aria-pressed={selected}
                    onClick={() => cart.setPayment(id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{label}</span>
                    {selected && <Check size={13} aria-hidden="true" />}
                  </Button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-[1fr_1.6fr] gap-2">
              <Button
                variant="warning"
                size="lg"
                className="px-2.5"
                disabled={!cart.state.items.length}
                leftIcon={<PauseCircle size={17} aria-hidden="true" />}
                onClick={onHold}
              >
                Hold Bill
              </Button>
              <Button
                variant="default"
                size="lg"
                className="px-2.5"
                disabled={!cart.state.items.length}
                leftIcon={<Printer size={17} aria-hidden="true" />}
                onClick={onProceedToCheckout}
              >
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
