"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ReceiptText,
  Boxes,
  ChartNoAxesCombined,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const links = [
  { href: "/billing", label: "Billing", icon: ReceiptText },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Sidebar({
  pathname,
  collapsed,
  onCollapse,
  onNavigate,
  mobile = false,
  openAlertCount = 0,
}: {
  pathname: string;
  collapsed?: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
  openAlertCount?: number;
}) {
  const { user } = useAuth();
  const visibleLinks = links.filter(
    (link) => user?.role !== "BILLING" || link.href === "/billing",
  );

  return (
    <div className="flex h-full flex-col bg-[#092b16] px-3 text-[#fff7dc]">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#b99a46]/30">
        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#d6b45e]/70 bg-[#103b20] shadow-xs">
          <Image
            src="/images/Sambar&SpicyRestaurantLogo.png"
            alt="Sambar & Spicy Logo"
            width={40}
            height={40}
            className="size-full object-cover"
            priority
          />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#fff7dc]">
            Sambar &amp; Spicy
            <small className="block truncate text-xs font-normal text-[#e1c983]">
              Restaurant workspace
            </small>
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0 text-[#fff7dc] hover:bg-[#103b20] hover:text-[#ebc96f]"
          onClick={mobile ? onNavigate : onCollapse}
          aria-label={
            mobile
              ? "Close navigation"
              : collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
        >
          {mobile ? (
            <X size={18} aria-hidden="true" />
          ) : collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
        </Button>
      </div>

      <div className="px-3 pt-5 pb-2 text-[11px] font-bold tracking-widest text-[#e1c983]/80 uppercase">
        {collapsed ? "MENU" : "WORKSPACE"}
      </div>

      <nav
        aria-label={mobile ? "Drawer navigation" : "Sidebar navigation"}
        className="space-y-1"
      >
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-[#17552f] text-[#fff9e9] ring-1 ring-[#ebc96f]/50 shadow-xs"
                  : "text-[#d8dfc6] hover:bg-[#103b20] hover:text-[#fff7dc]",
              )}
            >
              {active && !collapsed && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-[#ebc96f]"
                />
              )}
              <Icon
                size={19}
                className={cn(
                  "shrink-0",
                  active ? "text-[#ebc96f]" : "text-[#d8dfc6]",
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {label === "Inventory" && openAlertCount > 0 && !collapsed && (
                <b className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {openAlertCount}
                </b>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex min-h-16 items-center gap-3 border-t border-[#b99a46]/30 px-3 text-sm font-semibold text-[#fff7dc]">
        <span className="size-2 shrink-0 rounded-full bg-[#ebc96f]" />
        {!collapsed && (
          <span className="min-w-0 truncate">
            Single outlet
            <small className="block truncate text-xs font-normal text-[#d8dfc6]">
              Counter operations
            </small>
          </span>
        )}
      </div>
    </div>
  );
}

export function MobileBottomNav({
  pathname,
  openAlertCount = 0,
}: {
  pathname: string;
  openAlertCount?: number;
}) {
  const { user } = useAuth();
  const visibleLinks = links.filter(
    (link) => user?.role !== "BILLING" || link.href === "/billing",
  );

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-safe lg:hidden"
    >
      <div
        className="mx-auto grid max-w-2xl"
        style={{ gridTemplateColumns: `repeat(${visibleLinks.length}, minmax(0, 1fr))` }}
      >
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-semibold transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-[#b58a27] dark:bg-[#ebc96f]"
                />
              )}
              <span
                className={cn(
                  "relative grid size-7 place-items-center rounded-lg transition-colors",
                  active && "bg-primary/10 dark:bg-primary/25",
                )}
              >
                <Icon
                  size={18}
                  className={cn(active && "text-primary dark:text-[#ebc96f]")}
                  aria-hidden="true"
                />
                {label === "Inventory" && openAlertCount > 0 && (
                  <span
                    aria-label={`${openAlertCount} open alerts`}
                    className="absolute -top-1 -right-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white"
                  >
                    {openAlertCount}
                  </span>
                )}
              </span>
              <span className="truncate max-w-full">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
