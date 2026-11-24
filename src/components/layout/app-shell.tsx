"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar, links } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RoleGate } from "@/components/layout/role-gate";
import { WorkspaceLoading } from "@/components/shared/WorkspaceLoading";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);
  if (!ready || !user)
    return <WorkspaceLoading />;
  const title =
    links.find((link) => link.href === pathname)?.label ?? "Workspace";
  return (
    <div
      className={cn(
        "min-h-dvh overflow-x-clip bg-background text-foreground",
        pathname === "/billing" && "lg:h-dvh lg:overflow-hidden",
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[min(280px,100vw)]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a workspace page.
          </SheetDescription>
          <Sidebar
            pathname={pathname}
            mobile
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div
        className={cn(
          "min-w-0",
          pathname === "/billing" && "lg:flex lg:h-full lg:flex-col",
        )}
      >
        <OfflineBanner />
        <Topbar title={title} onMenu={() => setOpen(true)} />
        <main
          className={cn(
            "mx-auto w-full max-w-7xl p-4 sm:p-6",
            pathname === "/billing" && "lg:flex-1 lg:min-h-0 lg:max-w-none",
          )}
        >
          <RoleGate pathname={pathname}>{children}</RoleGate>
        </main>
      </div>
    </div>
  );
}
