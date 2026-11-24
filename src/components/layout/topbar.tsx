"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, Menu, ChefHat, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserMenu } from "@/components/layout/user-menu";
import { links } from "@/components/layout/sidebar";
import { InstallAppButton } from "@/components/layout/InstallAppButton";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useNotifications, useStoreSettings } from "@/hooks/queries";
import { DailySales } from "@/components/layout/daily-sales";

export function Topbar({
  title,
  onMenu,
}: {
  title: string;
  onMenu: () => void;
}) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const store = useStoreSettings();
  const { notifications, markRead } = useNotifications(
    user?.role === "ADMIN" || user?.role === "READ_ONLY",
  );
  const open = notifications.data?.filter((n) => n.status === "OPEN") ?? [],
    unread = open.filter((n) => !n.read_at).length;
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            className="size-11 p-0 md:hidden"
            onClick={onMenu}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </Button>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
            <ChefHat size={20} />
          </span>
          <div className="hidden min-w-0 sm:block [&_strong]:block [&_strong]:truncate [&_small]:block [&_small]:max-w-44 [&_small]:truncate [&_small]:text-xs [&_small]:font-normal [&_small]:text-muted-foreground">
            <strong>{store.data?.store_name ?? "Sambar & Spicy"}</strong>
            <small>{store.data?.address || "Restaurant workspace"}</small>
          </div>
          <span className="sr-only">{title}</span>
        </div>
        <nav
          className="hidden items-center gap-1 rounded-xl border border-border bg-muted p-1 md:flex"
          aria-label="Main navigation"
        >
          {links
            .filter((l) => user?.role !== "BILLING" || l.href === "/billing")
            .map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${pathname === href ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:bg-card"}`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {label === "Inventory" && open.length > 0 && (
                  <b className="rounded-full bg-destructive px-1.5 py-0.5 text-xs text-white">
                    {open.length}
                  </b>
                )}
              </Link>
            ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          {user?.role === "READ_ONLY" && (
            <span className="hidden xl:inline-flex">
              <StatusBadge tone="info">Read-only account</StatusBadge>
            </span>
          )}
          {store.isError && (
            <Button
              variant="ghost"
              className="size-11 p-0"
              aria-label="Retry store details"
              onClick={() => {
                void store.refetch();
              }}
            >
              !
            </Button>
          )}
          <InstallAppButton />
          {user?.role !== "BILLING" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative size-11 p-0"
                  aria-label={`Notifications, ${unread} unread`}
                >
                  <Bell size={19} />
                  {unread > 0 && (
                    <span className="absolute top-0 right-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-white">
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
                <DropdownMenuSeparator className="" />
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
                      className="min-h-11 border border-border px-3"
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
            className="size-11 p-0"
            onClick={toggle}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
          </Button>
          <span className="mx-1 h-8 w-px bg-border" />
          <UserMenu />
        </div>
      </header>
      {pathname === "/billing" && user?.role !== "BILLING" && <DailySales />}
    </>
  );
}
