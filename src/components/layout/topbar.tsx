"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, Bell, Clock, Moon, RefreshCw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserMenu } from "@/components/layout/user-menu";
import { InstallAppButton } from "@/components/layout/InstallAppButton";
import { SyncQueueDialog } from "@/components/billing/SyncQueueDialog";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useNotifications, useStoreSettings } from "@/hooks/queries";
import { useBillingSync } from "@/hooks/useBillingSync";
import { DailySales } from "@/components/layout/daily-sales";

export function Topbar({
  title,
}: {
  title: string;
  onMenu?: () => void;
}) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const store = useStoreSettings();
  const [syncOpen, setSyncOpen] = useState(false);
  const { pendingCount, failedCount, isSyncing } = useBillingSync();
  const { notifications, markRead } = useNotifications(
    user?.role === "ADMIN" || user?.role === "READ_ONLY",
  );
  const open = notifications.data?.filter((n) => n.status === "OPEN") ?? [];
  const unread = open.filter((n) => !n.read_at).length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-secondary shadow-2xs sm:size-10 lg:hidden">
            <Image
              src="/images/Sambar&SpicyRestaurantLogo.png"
              alt="Sambar & Spicy Logo"
              width={40}
              height={40}
              className="size-full object-cover"
              priority
            />
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-bold text-foreground sm:text-base">
              {store.data?.store_name ?? title}
            </strong>
            <small className="hidden truncate text-xs font-normal text-muted-foreground sm:block">
              {store.data?.address || title}
            </small>
          </div>
          <span className="sr-only">{title}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {failedCount > 0 ? (
            <button
              type="button"
              onClick={() => setSyncOpen(true)}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 sm:px-2.5 sm:text-xs dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/60"
              aria-label={`${failedCount} sync failed. Open sync queue`}
            >
              <AlertTriangle size={13} aria-hidden="true" />
              <span className="whitespace-nowrap">{failedCount} sync failed</span>
            </button>
          ) : isSyncing || pendingCount > 0 ? (
            <button
              type="button"
              onClick={() => setSyncOpen(true)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-xs ${
                isSyncing
                  ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:border-[#ebc96f]/30 dark:bg-primary/20 dark:text-[#ebc96f]"
                  : "border-[#b58a27]/40 bg-[#f3ecda] text-[#7c5c17] hover:bg-[#eadfc2] dark:border-[#ebc96f]/30 dark:bg-[#2a220d] dark:text-[#ebc96f]"
              }`}
              aria-label="Open offline sync queue"
            >
              {isSyncing ? (
                <RefreshCw size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <Clock size={13} aria-hidden="true" />
              )}
              <span className="whitespace-nowrap">
                {isSyncing ? `Syncing ${pendingCount}...` : `${pendingCount} pending`}
              </span>
            </button>
          ) : null}

          {user?.role === "READ_ONLY" && (
            <span className="hidden xl:inline-flex">
              <StatusBadge tone="info">Read-only account</StatusBadge>
            </span>
          )}

          {store.isError && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 sm:size-10"
              aria-label="Retry store details"
              onClick={() => {
                void store.refetch();
              }}
            >
              !
            </Button>
          )}

          <span className="hidden sm:inline-flex">
            <InstallAppButton />
          </span>

          {user?.role !== "BILLING" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative size-9 sm:size-10"
                  aria-label={`Notifications, ${unread} unread`}
                >
                  <Bell size={18} aria-hidden="true" />
                  {unread > 0 && (
                    <span className="absolute top-0.5 right-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="max-h-96 w-72 overflow-y-auto"
              >
                <div className="px-3 py-2 text-xs text-muted-foreground [&_strong]:block [&_strong]:text-foreground">
                  <strong>Stock alerts</strong>
                  {unread} unread
                </div>
                <DropdownMenuSeparator />
                {markRead.isError && (
                  <p className="px-3 py-2 text-sm text-destructive" role="alert">
                    Could not mark the alert as read. Please try again.
                  </p>
                )}
                {notifications.isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    Loading alerts...
                  </p>
                ) : notifications.isError ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    Could not load alerts.{" "}
                    <Button
                      variant="ghost"
                      className="min-h-10 border border-border px-3"
                      onClick={() => {
                        void notifications.refetch();
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : open.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No open stock alerts.
                  </p>
                ) : (
                  open.slice(0, 5).map((n) => (
                    <div
                      className="flex flex-col gap-1 border-t border-border p-3 text-sm text-muted-foreground [&_strong]:text-foreground"
                      key={n.id}
                    >
                      <strong>
                        {n.severity === "CRITICAL" ? "Critical" : "Low stock"}
                      </strong>
                      <span>{n.message}</span>
                      {user?.role === "ADMIN" && !n.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={markRead.isPending}
                          onClick={() => markRead.mutate(n.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-9 sm:size-10"
            onClick={toggle}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </Button>

          <span className="hidden h-7 w-px bg-border sm:mx-0.5 sm:block" />
          <UserMenu />
        </div>
      </header>
      <SyncQueueDialog open={syncOpen} onOpenChange={setSyncOpen} />
      {pathname === "/billing" && user?.role !== "BILLING" && <DailySales />}
    </>
  );
}
