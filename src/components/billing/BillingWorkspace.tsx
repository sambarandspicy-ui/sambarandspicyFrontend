"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { FolderClock, ShoppingBag } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import {
  reconcileSyncedBillInCache,
  useBilling,
  useCatalog,
  useStoreSettings,
} from "@/hooks/queries";
import { useBillingCart } from "@/hooks/useBillingCart";
import { useLocalFirstCheckout } from "@/hooks/useLocalFirstCheckout";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { formatINR } from "@/lib/format";
import type { BillDetail, DietaryType, PortionSize } from "@/types/domain";
import type { BillInput } from "@/services/api/types";
import { billingSyncManager } from "@/services/offline/billingSyncManager";
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
  const queryClient = useQueryClient();
  const canEdit = user?.role !== "READ_ONLY";
  const { categories, menuItems } = useCatalog();
  const storeSettings = useStoreSettings();
  const billing = useBilling();
  const cart = useBillingCart(canEdit);
  const dietaryDragScroll = useMouseDragScroll();
  const dietaryStrip = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const [dietary, setDietary] = useState<DietaryType | "ALL">("ALL");
  const [sort, setSort] = useState<SortMode>("default");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
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

  useEffect(() => {
    if (
      cart.state.roundOff &&
      (billing.capabilities.isError || billing.capabilities.data?.round_off === false)
    ) {
      cart.setRoundOff(false);
    }
  }, [billing.capabilities.isError, billing.capabilities.data?.round_off, cart]);

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined")
      return;
    // Browsers can restore a previous horizontal position on reload.
    const frame = requestAnimationFrame(() => {
      if (dietaryStrip.current) dietaryStrip.current.scrollLeft = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = billingSyncManager.onBillSynced((syncedBill, clientBillId) => {
      reconcileSyncedBillInCache(queryClient, syncedBill, clientBillId);
      setLastCompletedBill((prev) =>
        prev &&
        (prev.clientBillId === clientBillId || prev.client_bill_id === clientBillId)
          ? syncedBill
          : prev,
      );
      setReceiptBill((prev) =>
        prev &&
        (prev.clientBillId === clientBillId || prev.client_bill_id === clientBillId)
          ? syncedBill
          : prev,
      );
    });
    return unsubscribe;
  }, [queryClient]);

  const activeCategories = (categories.data ?? [])
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const activeItems = (menuItems.data ?? []).filter(
    (i) => i.is_available && activeCategories.some((c) => c.id === i.category_id),
  );

  const items = (() => {
    const q = search.trim().toLowerCase();
    return activeItems
      .filter(
        (i) =>
          (category === null || i.category_id === category) &&
          (dietary === "ALL" || i.dietary_type === dietary) &&
          (!q || i.name.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)),
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

  const quantities = cart.state.items.reduce<
    Record<number, Record<PortionSize, number>>
  >((counts, item) => {
    counts[item.menuItemId] ??= { FULL: 0, HALF: 0 };
    counts[item.menuItemId][item.portion] += item.quantity;
    return counts;
  }, {});

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

  const { checkout, isSaving: localSaving } = useLocalFirstCheckout({
    user,
    canEdit,
    roundOffEnabled: billing.capabilities.data?.round_off === true,
    cartItems: cart.state.items,
    menu: menuItems.data ?? [],
    store: storeSettings.data,
    fallbackCheckout: billing.checkout.mutateAsync,
    simulatePostCheckoutFailure,
    onCheckoutCommitted: (bill, options) => {
      setLastCompletedBill(bill);
      cart.clear();
      setCheckoutOpen(false);
      setCartSheetOpen(false);
      if (options?.print !== false) {
        setReceiptBill(bill);
        setIsReprint(false);
        setReceiptOpen(true);
      } else {
        setNotice(`Payment saved (${bill.bill_number ?? `Bill #${bill.id}`}).`);
      }
    },
  });

  if (!user) return null;

  const heldCount = billing.held.data?.length ?? 0;

  const headerActions = (
    <BillingHeaderBar
      role={user.role}
      onPastBills={() => {
        setCartSheetOpen(false);
        setPastOpen(true);
      }}
      lastBillNumber={lastCompletedBill?.bill_number ?? null}
      onLastReceipt={() => {
        setCartSheetOpen(false);
        setReceiptBill(lastCompletedBill);
        setIsReprint(true);
        setReceiptOpen(true);
      }}
    />
  );

  return (
    <div className="min-w-0 lg:flex lg:h-full lg:flex-col">
      <h1 className="sr-only">Counter Billing</h1>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}

      <div className="flex min-h-0 flex-1 flex-col gap-4 pb-24 lg:grid lg:grid-cols-[minmax(0,65fr)_minmax(340px,35fr)] lg:pb-0">
        <div
          id="billing-menu-top"
          className="pos-scroll min-w-0 lg:h-full lg:overflow-y-auto lg:pr-1"
        >
          <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-sm sm:top-16 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-1 lg:px-1">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <MenuSearchBar value={search} onChange={setSearch} />
              <div
                {...dietaryDragScroll}
                ref={dietaryStrip}
                className="mouse-drag-scroll pos-scroll no-scrollbar flex w-full min-w-0 snap-x flex-nowrap gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1 sm:w-auto sm:max-w-[60%]"
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
                    size="sm"
                    className="min-h-9 flex-1 shrink-0 snap-start gap-1 px-2.5 text-xs font-semibold sm:min-h-10 sm:flex-none sm:px-3 sm:text-sm"
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
          </div>

          <CategoryStrip
            categories={activeCategories}
            items={activeItems}
            selected={category}
            onSelect={setCategory}
          />

          <MenuGrid
            categories={activeCategories}
            title={
              category === null
                ? "All Items"
                : (activeCategories.find((c) => c.id === category)?.name ?? "Menu")
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

        {/* Desktop split right-column cart panel */}
        <div id="current-bill" className="hidden lg:block lg:h-full lg:min-h-0">
          <BillingCartPanel
            roundOffAvailable={billing.capabilities.data?.round_off === true}
            roundOffLoading={
              billing.capabilities.isFetching && !billing.capabilities.data
            }
            onRetryRoundOff={() => {
              void billing.capabilities.refetch();
            }}
            headerActions={headerActions}
            cart={cart}
            menu={menuItems.data ?? []}
            categories={categories.data ?? []}
            canEdit={canEdit}
            heldCount={heldCount}
            onHold={() => setHoldOpen(true)}
            onHeld={() => setHeldOpen(true)}
            onProceedToCheckout={() => setCheckoutOpen(true)}
          />
        </div>
      </div>

      {/* Floating mobile cart bar positioned cleanly above MobileBottomNav */}
      <div
        className="fixed inset-x-3 bottom-[calc(3.75rem+env(safe-area-inset-bottom)+0.5rem)] z-[45] flex items-center gap-2 rounded-2xl border border-[#b99a46]/60 bg-[#17552f] p-2 text-white shadow-2xl lg:hidden"
      >
        <button
          type="button"
          onClick={() => setCartSheetOpen(true)}
          className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-2 text-left"
          aria-label="View Cart"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ShoppingBag size={18} className="shrink-0 text-[#ebc96f]" aria-hidden="true" />
            <span className="min-w-0 truncate text-xs font-bold sm:text-sm">
              <span className="text-[#ebc96f] tabular-nums">
                {cart.totals.count} {cart.totals.count === 1 ? "item" : "items"}
              </span>{" "}
              ·{" "}
              <span className="tabular-nums text-white">
                {formatINR(cart.totals.total)}
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-lg bg-[#ebc96f] px-2.5 py-1.5 text-xs font-extrabold text-[#092b16]">
            View Cart
          </span>
        </button>

        <Button
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0 border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/20"
          onClick={() => setHeldOpen(true)}
          aria-label="Open held bills"
        >
          <FolderClock size={14} aria-hidden="true" />
          <span>Held ({heldCount})</span>
        </Button>
      </div>

      {/* Mobile bottom-sheet wrapper around BillingCartPanel */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="p-0 lg:hidden">
          <SheetTitle className="sr-only">Current bill cart</SheetTitle>
          <SheetDescription className="sr-only">
            Review items, hold orders, or complete checkout.
          </SheetDescription>
          <BillingCartPanel
            inSheet
            onCloseSheet={() => setCartSheetOpen(false)}
            roundOffAvailable={billing.capabilities.data?.round_off === true}
            roundOffLoading={
              billing.capabilities.isFetching && !billing.capabilities.data
            }
            onRetryRoundOff={() => {
              void billing.capabilities.refetch();
            }}
            headerActions={headerActions}
            cart={cart}
            menu={menuItems.data ?? []}
            categories={categories.data ?? []}
            canEdit={canEdit}
            heldCount={heldCount}
            onHold={() => {
              setCartSheetOpen(false);
              setHoldOpen(true);
            }}
            onHeld={() => {
              setCartSheetOpen(false);
              setHeldOpen(true);
            }}
            onProceedToCheckout={() => {
              setCartSheetOpen(false);
              setCheckoutOpen(true);
            }}
          />
        </SheetContent>
      </Sheet>

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
          pending={localSaving || billing.checkout.isPending}
        />
      )}

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
