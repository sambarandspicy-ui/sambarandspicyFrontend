"use client";
import { useEffect, useRef, useState } from "react";
import { Toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { ReceiptText } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useBilling, useCatalog } from "@/hooks/queries";
import { useBillingCart } from "@/hooks/useBillingCart";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { formatINR } from "@/lib/format";
import type { BillDetail, DietaryType, PortionSize } from "@/types/domain";
import type { BillInput, CheckoutInput } from "@/services/api/types";
import { ApiError } from "@/types/api";
import { BillingHeaderBar } from "./BillingHeaderBar";
import { MenuSearchBar } from "./MenuSearchBar";
import { CategoryStrip } from "./CategoryStrip";
import { MenuGrid, type SortMode } from "./MenuGrid";
import { BillingCartPanel } from "./BillingCartPanel";
import { HoldBillDialog } from "./HoldBillDialog";
import { HeldBillsDrawer } from "./HeldBillsDrawer";
import { CheckoutDialog } from "./CheckoutDialog";
import { ReceiptDialog } from "./ReceiptDialog";
import { PastBillsDrawer } from "./PastBillsDrawer";
export function BillingWorkspace({
  simulatePostCheckoutFailure,
}: {
  simulatePostCheckoutFailure?: (bill: BillDetail) => void | Promise<void>;
} = {}) {
  const { user } = useAuth();
  const canEdit = user?.role !== "READ_ONLY";
  const { categories, menuItems } = useCatalog();
  const billing = useBilling();
  const cart = useBillingCart(canEdit);
  const dietaryDragScroll = useMouseDragScroll();
  const dietaryStrip = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const [dietary, setDietary] = useState<DietaryType | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("default");
  const [holdOpen, setHoldOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptBill, setReceiptBill] = useState<BillDetail | null>(null);
  const [lastCompletedBill, setLastCompletedBill] = useState<BillDetail | null>(
    null,
  );
  const [isReprint, setIsReprint] = useState(false);
  const [notice, setNotice] = useState("");
  const [billVisible, setBillVisible] = useState(false);
  useEffect(() => {
    if (cart.state.roundOff && (billing.capabilities.isError || billing.capabilities.data?.round_off === false)) {
      cart.setRoundOff(false);
    }
  }, [billing.capabilities.isError, billing.capabilities.data?.round_off, cart]);
  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return;
    // Browsers can restore a previous horizontal position on reload.
    const frame = requestAnimationFrame(() => {
      if (dietaryStrip.current) dietaryStrip.current.scrollLeft = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [user?.id]);
  useEffect(() => {
    const bill = document.getElementById("billing-cart-panel");
    if (!bill || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setBillVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(bill);
    return () => observer.disconnect();
  }, [user?.id]);
  const activeCategories = (categories.data ?? [])
    .filter((c) => c.is_active)
    .sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
  const activeItems = (menuItems.data ?? []).filter(
    (i) =>
      i.is_available && activeCategories.some((c) => c.id === i.category_id),
  );
  const items = (() => {
    const q = search.trim().toLowerCase();
    return activeItems
      .filter(
        (i) =>
          (category === null || i.category_id === category) &&
          (dietary === "ALL" || i.dietary_type === dietary) &&
          (!q ||
            i.name.toLowerCase().includes(q) ||
            i.sku?.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        sort === "low"
          ? a.selling_price - b.selling_price
          : sort === "high"
            ? b.selling_price - a.selling_price
            : sort === "name"
              ? a.name.localeCompare(b.name)
              : a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      );
  })();
  const quantities = cart.state.items.reduce<Record<number, Record<PortionSize, number>>>(
    (counts, item) => {
      counts[item.menuItemId] ??= { FULL: 0, HALF: 0 };
      counts[item.menuItemId][item.portion] += item.quantity;
      return counts;
    },
    {},
  );
  async function hold(input: BillInput) {
    if (!canEdit) return;
    await billing.hold.mutateAsync(input);
    cart.clear();
    setNotice("Bill saved to held orders.");
  }
  async function cancel(id: number, reason: string) {
    if (!canEdit) return;
    await billing.cancel.mutateAsync({ id, reason });
    if (cart.state.resumedBillId === id) cart.clear();
    setNotice("Held bill cancelled.");
  }
  async function checkout(input: CheckoutInput) {
    if (!canEdit) throw new Error("Access denied");
    if (input.round_off && billing.capabilities.data?.round_off !== true)
      throw new ApiError("ROUND_OFF_UNAVAILABLE", "Round off is unavailable. Refresh after updating the billing service.", 400);
    const bill = await billing.checkout.mutateAsync(input);
    if (process.env.NODE_ENV !== "production")
      await simulatePostCheckoutFailure?.(bill);
    setLastCompletedBill(bill);
    setReceiptBill(bill);
    setIsReprint(false);
    cart.clear();
    setReceiptOpen(true);
    return bill;
  }
  if (!user) return null;
  return (
    <div className="min-w-0 lg:flex lg:h-full lg:flex-col">
      <h1 className="sr-only">Counter Billing</h1>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      <div className={`flex min-h-0 flex-1 flex-col gap-4 ${billVisible ? "pb-2" : "pb-24"} lg:grid lg:grid-cols-[minmax(0,65fr)_minmax(320px,35fr)] lg:pb-0`}>
        <div id="billing-menu-top" className="pos-scroll min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1">
          <div className={`sticky top-14 z-20 -mx-4 border-b border-border bg-background px-4 pb-1 pt-1 sm:top-16 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-1 lg:px-1 ${billVisible ? "max-lg:relative max-lg:top-auto" : ""}`}>
          <div className="flex min-w-0 items-center gap-2">
            <MenuSearchBar value={search} onChange={setSearch} />
          <div
            {...dietaryDragScroll}
            ref={dietaryStrip}
            className="mouse-drag-scroll filter-scroll flex w-[55%] min-w-0 snap-x flex-nowrap gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1 sm:w-auto sm:max-w-[60%]"
            role="group"
            aria-label="Dietary type"
          >
            {(
              [
                { id: "ALL", label: "All" },
                { id: "VEG", label: "Veg" },
                { id: "NON_VEG", label: "Non-Veg" },
                { id: "EGG", label: "Egg" },
              ] as const
            ).map((option) => (
              <Button
                key={option.id}
                variant={dietary === option.id ? "default" : "ghost"}
                size="lg"
                className="min-h-11 snap-start gap-1.5 px-3"
                aria-pressed={dietary === option.id}
                onClick={() => setDietary(option.id)}
              >
                {option.id !== "ALL" && (
                  <span aria-hidden="true">
                    <DietaryBadge type={option.id} />
                  </span>
                )}
                {option.label}
              </Button>
            ))}
          </div>
          </div>
          <CategoryStrip
            categories={activeCategories}
            items={activeItems}
            selected={category}
            onSelect={setCategory}
          />
          </div>
          <MenuGrid
            categories={activeCategories}
            title={
              category === null
                ? "All Items"
                : (activeCategories.find((c) => c.id === category)?.name ??
                  "Menu")
            }
            items={items}
            sort={sort}
            onSort={setSort}
            loading={categories.isLoading || menuItems.isLoading}
            error={categories.isError || menuItems.isError}
            quantities={quantities}
            canEdit={canEdit}
            onAdd={cart.add}
            onReset={() => {
              setSearch("");
              setCategory(null);
              setDietary("ALL");
            }}
            onRetry={() => {
              void Promise.all([categories.refetch(), menuItems.refetch()]);
            }}
          />
        </div>
        {/* billor mobile viewng f */}
        <div
          className={`fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-card/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur-md lg:hidden ${billVisible ? "hidden" : ""}`}
        >
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            {cart.totals.count} {cart.totals.count === 1 ? "item" : "items"}
            <strong className="block truncate text-base tabular-nums text-foreground">
              {formatINR(cart.totals.total)}
            </strong>
          </span>
          <a
            href="#billing-cart-panel"
            onClick={(event) => {
              event.preventDefault();
              setHeldOpen(true);
            }}
            className="flex min-h-11 shrink-0 items-center rounded-xl border border-border px-3 text-xs font-semibold"
            aria-label="Open held bills"
          >
            Held ({billing.held.data?.length ?? 0})
          </a>
          <a
            href="#billing-cart-panel"
            onClick={(event) => {
              event.preventDefault();
              const el = document.getElementById("billing-cart-panel");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                window.location.hash = "billing-cart-panel";
              }
            }}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-white"
          >
            <ReceiptText size={18} aria-hidden="true" />
            View bill
            <span className="sr-only">
              {" "}
              {cart.totals.count} {cart.totals.count === 1 ? "item" : "items"}
            </span>
          </a>
        </div>
        <div id="current-bill" className="min-h-[calc(100dvh-5rem)] sm:min-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:h-full">
          <BillingCartPanel
            roundOffAvailable={billing.capabilities.data?.round_off === true}
            roundOffLoading={billing.capabilities.isFetching && !billing.capabilities.data}
            onRetryRoundOff={() => { void billing.capabilities.refetch(); }}
            headerActions={
              <BillingHeaderBar
                role={user.role}
                onPastBills={() => setPastOpen(true)}
                lastBillNumber={lastCompletedBill?.bill_number ?? null}
                onLastReceipt={() => {
                  setReceiptBill(lastCompletedBill);
                  setIsReprint(true);
                  setReceiptOpen(true);
                }}
              />
            }
            cart={cart}
            menu={menuItems.data ?? []}
            categories={categories.data ?? []}
            canEdit={canEdit}
            heldCount={billing.held.data?.length ?? 0}
            onHold={() => setHoldOpen(true)}
            onHeld={() => setHeldOpen(true)}
            onProceedToCheckout={() => setCheckoutOpen(true)}
          />
        </div>
      </div>
      {canEdit && holdOpen && (
        <HoldBillDialog
          open={holdOpen}
          onOpenChange={setHoldOpen}
          cart={cart}
          onHold={hold}
          pending={billing.hold.isPending}
        />
      )}
      <HeldBillsDrawer
        open={heldOpen}
        onOpenChange={setHeldOpen}
        bills={billing.held.data ?? []}
        loading={billing.held.isLoading}
        error={billing.held.isError}
        onRetry={() => {
          void billing.held.refetch();
        }}
        canEdit={canEdit}
        hasItems={cart.state.items.length > 0}
        onResume={(bill) => cart.resume(bill, menuItems.data ?? [])}
        onCancel={cancel}
        pending={billing.cancel.isPending}
      />
      {canEdit && checkoutOpen && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          cart={cart}
          menu={menuItems.data ?? []}
          categories={categories.data ?? []}
          onCheckout={checkout}
          pending={billing.checkout.isPending}
        />
      )}{" "}
      {user.role !== "BILLING" && (
        <PastBillsDrawer
          open={pastOpen}
          onOpenChange={setPastOpen}
          onReceipt={(bill) => {
            setReceiptBill(bill);
            setIsReprint(true);
            setReceiptOpen(true);
          }}
        />
      )}
      <ReceiptDialog
        bill={receiptBill}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        isReprint={isReprint}
        role={user.role}
        onLogReprint={(id) => billing.reprint.mutateAsync(id)}
      />
    </div>
  );
}
