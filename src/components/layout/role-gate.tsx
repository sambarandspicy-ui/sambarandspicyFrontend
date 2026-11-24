"use client";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export function RoleGate({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (user?.role === "BILLING" && pathname !== "/billing") {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center">
        <span className="rounded-xl bg-amber-50 p-3 text-amber-700">
          <ShieldAlert size={24} />
        </span>
        <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
        <p className="text-muted-foreground">
          Your billing account does not have access to this page.
        </p>
        <Button asChild size="lg">
          <Link href="/billing">Return to billing</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
