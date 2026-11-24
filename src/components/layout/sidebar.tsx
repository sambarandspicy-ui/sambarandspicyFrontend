"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ReceiptText,
  Boxes,
  ChartNoAxesCombined,
  Settings,
  PanelLeftClose,
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
}: {
  pathname: string;
  collapsed?: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col px-3">
      <div className="flex h-16 items-center gap-3 border-b border-border">
        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-xs">
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
          <span className="text-sm font-bold">
            Sambar &amp; Spicy
            <small className="block text-xs font-normal text-muted-foreground">
              Restaurant workspace
            </small>
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={mobile ? onNavigate : onCollapse}
          aria-label={
            mobile
              ? "Close navigation"
              : collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
        >
          {mobile ? <X size={18} /> : <PanelLeftClose size={18} />}
        </Button>
      </div>
      <div className="px-3 pt-6 pb-2 text-xs font-semibold tracking-wider text-muted-foreground">
        {collapsed ? "MENU" : "WORKSPACE"}
      </div>
      <nav aria-label="Main navigation">
        {links
          .filter(
            (link) => user?.role !== "BILLING" || link.href === "/billing",
          )
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              onClick={onNavigate}
              className={cn(
                "mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted",
                pathname === href && "bg-primary text-white hover:bg-primary",
              )}
            >
              <Icon size={19} />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
      </nav>
      <div className="mt-auto flex min-h-20 items-center gap-3 border-t border-border px-3 text-sm font-semibold">
        {!collapsed && (
          <>
            <span className="size-2 rounded-full bg-success" />
            <span>
              Single outlet
              <small className="block text-xs font-normal text-muted-foreground">
                Counter operations
              </small>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
