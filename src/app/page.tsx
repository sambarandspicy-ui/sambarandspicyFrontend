"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { WorkspaceLoading } from "@/components/shared/WorkspaceLoading";
export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(user ? "/billing" : "/login");
  }, [ready, user, router]);
  return <WorkspaceLoading />;
}
