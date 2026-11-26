"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { MobileBottomNav, Sidebar, links } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RoleGate } from "@/components/layout/role-gate";
import { WorkspaceLoading } from "@/components/shared/WorkspaceLoading";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { reconcileSyncedBillInCache, useNotifications } from "@/hooks/queries";
import { useBillingSync } from "@/hooks/useBillingSync";
import { billingSyncManager } from "@/services/offline/billingSyncManager";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { pendingCount, failedCount } = useBillingSync();
  const hasUnsyncedBills = pendingCount > 0 || failedCount > 0;
  const canReadAlerts = user?.role === "ADMIN" || user?.role === "READ_ONLY";
  const notifications = useNotifications(canReadAlerts);
  const openAlertCount =
    notifications.notifications.data?.filter((n) => n.status === "OPEN").length ?? 0;

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user?.id) return;
    const releaseSync = billingSyncManager.acquire();
    const unsubscribe = billingSyncManager.onBillSynced((syncedBill, clientBillId) => {
      reconcileSyncedBillInCache(queryClient, syncedBill, clientBillId);
    });
    return () => {
      unsubscribe();
      releaseSync();
    };
  }, [ready, user?.id, queryClient]);

  useEffect(() => {
    if (!hasUnsyncedBills || typeof window === "undefined") return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsyncedBills]);

  if (!ready || !user) return <WorkspaceLoading />;

  const title =
    links.find((link) => link.href === pathname)?.label ?? "Workspace";

  return (
    <div
      className={cn(
        "min-h-dvh overflow-x-clip bg-background text-foreground lg:flex",
        pathname === "/billing" && "lg:h-dvh lg:overflow-hidden",
      )}
    >
      <aside
        className={cn(
          "hidden shrink-0 border-r border-[#b99a46]/30 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col",
          collapsed ? "lg:w-[76px]" : "lg:w-64",
        )}
      >
        <Sidebar
          pathname={pathname}
          collapsed={collapsed}
          onCollapse={() => setCollapsed((prev) => !prev)}
          openAlertCount={openAlertCount}
        />
      </aside>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          pathname === "/billing" && "lg:h-full",
        )}
      >
        <OfflineBanner />
        <Topbar title={title} />
        <main
          className={cn(
            "mx-auto w-full max-w-7xl flex-1 p-4 pb-20 sm:p-6 sm:pb-24 lg:pb-6",
            pathname === "/billing" && "lg:min-h-0 lg:max-w-none",
          )}
        >
          <RoleGate pathname={pathname}>{children}</RoleGate>
        </main>
        <MobileBottomNav pathname={pathname} openAlertCount={openAlertCount} />
      </div>
    </div>
  );
}
