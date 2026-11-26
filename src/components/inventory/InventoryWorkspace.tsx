"use client";
import { useState } from "react";
import { Toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { Plus, LockKeyhole } from "lucide-react";
import { QueryError, QuerySkeleton } from "@/components/shared/QueryState";
import { useAuth } from "@/providers/auth-provider";
import { useInventory, useNotifications } from "@/hooks/queries";
import type { InventoryItem } from "@/types/domain";
import type { InventoryInput } from "@/services/api/types";
import { InventoryKpiCards } from "./InventoryKpiCards";
import { StockBalanceTable } from "./StockBalanceTable";
import { DailyStockLessCard } from "./DailyStockLessCard";
import { RestockAlertsCard } from "./RestockAlertsCard";
import { InventoryItemDialog } from "./InventoryItemDialog";
import { AddPurchaseDrawer } from "./AddPurchaseDrawer";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { PurchasesTab } from "./PurchasesTab";
import { DailyEntriesTab } from "./DailyEntriesTab";
import { StockHistoryTab } from "./StockHistoryTab";
type Tab = "overview" | "purchases" | "daily" | "history";
const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Stock overview" },
  { id: "purchases", label: "Purchases" },
  { id: "daily", label: "Daily use & waste" },
  { id: "history", label: "Stock history" },
];
export function InventoryWorkspace() {
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const inventory = useInventory();
  const notifications = useNotifications();
  const [tab, setTab] = useState<Tab>("overview");
  const [itemDialog, setItemDialog] = useState<{
    item: InventoryItem | null;
  } | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState("");
  const [notice, setNotice] = useState("");
  const items = inventory.items.data ?? [];
  const movements = inventory.movements.data ?? [];
  const busy =
    inventory.items.isLoading ||
    inventory.purchases.isLoading ||
    inventory.dailyEntries.isLoading ||
    inventory.movements.isLoading ||
    notifications.notifications.isLoading;
  const failed =
    inventory.items.isError ||
    inventory.purchases.isError ||
    inventory.dailyEntries.isError ||
    inventory.movements.isError ||
    notifications.notifications.isError;
  async function saveItem(input: InventoryInput) {
    if (!admin) throw new Error("Access denied");
    if (itemDialog?.item) {
      const { name, sku, unit, min_limit_qty, critical_limit_qty, is_active } =
        input;
      await inventory.updateItem.mutateAsync({
        id: itemDialog.item.id,
        input: {
          name,
          sku,
          unit,
          min_limit_qty,
          critical_limit_qty,
          is_active,
        },
      });
    } else await inventory.createItem.mutateAsync(input);
    setNotice(itemDialog?.item ? "Stock item updated." : "Stock item created.");
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Inventory management"
        description="Track stock, purchases and daily usage."
        actions={
          admin && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setItemDialog({ item: null })}
              >
                <Plus size={17} /> New stock item
              </Button>
              <Button size="lg" onClick={() => setPurchaseOpen(true)}>
                <Plus size={17} /> Add buying stock
              </Button>
            </>
          )
        }
      />
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      <div className="flex flex-wrap items-start gap-3">
        <nav
          className="pos-scroll no-scrollbar flex max-w-full flex-nowrap gap-1 overflow-x-auto rounded-xl border border-border bg-muted p-1"
          aria-label="Inventory sections"
          role="group"
        >
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "ghost"}
              size="default"
              className="shrink-0 whitespace-nowrap"
              aria-current={tab === t.id ? "page" : undefined}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </nav>
      </div>
      {busy ? (
        <QuerySkeleton />
      ) : failed ? (
        <QueryError
          onRetry={() => {
            void Promise.all([
              inventory.items.refetch(),
              inventory.purchases.refetch(),
              inventory.dailyEntries.refetch(),
              inventory.movements.refetch(),
              notifications.notifications.refetch(),
            ]);
          }}
        />
      ) : tab === "overview" ? (
        <>
          <InventoryKpiCards items={items} />
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-8">
              <StockBalanceTable
                items={items}
                admin={admin}
                onLedger={(id) => {
                  setHistoryItem(String(id));
                  setTab("history");
                }}
                onEdit={(item) => setItemDialog({ item })}
                onAdjust={setAdjustItem}
              />
            </div>
            <aside className="grid min-w-0 gap-5 xl:col-span-4">
              {admin ? (
                <DailyStockLessCard
                  items={items}
                  pending={inventory.dailyEntry.isPending}
                  onSubmit={async (input) => {
                    await inventory.dailyEntry.mutateAsync(input);
                    setNotice("Daily stock entry recorded.");
                  }}
                />
              ) : (
                <Card className="flex gap-3 p-5">
                  <LockKeyhole size={20} />
                  <div>
                    <h2 className="font-semibold">Read-only access</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Stock entries and corrections are available to the admin
                      account.
                    </p>
                  </div>
                </Card>
              )}
              <RestockAlertsCard
                alerts={notifications.notifications.data ?? []}
                items={items}
                admin={admin}
                pending={notifications.markRead.isPending}
                onRefresh={() => {
                  void notifications.notifications.refetch();
                }}
                onRead={(id) => {
                  notifications.markRead.mutate(id, {
                    onError: () =>
                      setNotice("Could not mark the alert as read."),
                  });
                }}
              />
            </aside>
          </div>
        </>
      ) : tab === "purchases" ? (
        <PurchasesTab
          purchases={inventory.purchases.data ?? []}
          items={items}
        />
      ) : tab === "daily" ? (
        <DailyEntriesTab
          entries={inventory.dailyEntries.data ?? []}
          items={items}
        />
      ) : (
        <StockHistoryTab
          movements={movements}
          items={items}
          selected={historyItem}
          onSelected={setHistoryItem}
        />
      )}{" "}
      {admin && itemDialog && (
        <InventoryItemDialog
          item={itemDialog.item}
          hasMovements={
            !!itemDialog.item &&
            movements.some((m) => m.inventory_item_id === itemDialog.item!.id)
          }
          onClose={() => setItemDialog(null)}
          onSave={saveItem}
          pending={
            inventory.createItem.isPending || inventory.updateItem.isPending
          }
        />
      )}{" "}
      {admin && purchaseOpen && (
        <AddPurchaseDrawer
          items={items}
          onClose={() => setPurchaseOpen(false)}
          onSave={async (input) => {
            await inventory.purchase.mutateAsync(input);
            setNotice("Buying stock recorded.");
          }}
          pending={inventory.purchase.isPending}
        />
      )}{" "}
      {admin && adjustItem && (
        <StockAdjustmentDialog
          item={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSave={async (input) => {
            await inventory.adjust.mutateAsync(input);
            setNotice("Stock correction recorded.");
          }}
          pending={inventory.adjust.isPending}
        />
      )}
    </div>
  );
}
