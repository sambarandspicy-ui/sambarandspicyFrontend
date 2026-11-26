"use client";
import { useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
import { useBillingSync } from "@/hooks/useBillingSync";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const { pendingCount, failedCount } = useBillingSync();

  if (online) return null;

  const queueNote =
    pendingCount > 0
      ? ` ${pendingCount} ${pendingCount === 1 ? "bill" : "bills"} queued for auto-sync.`
      : "";
  const failedNote = failedCount > 0 ? ` ${failedCount} failed.` : "";

  return (
    <Alert variant="warning" className="rounded-none text-center" role="status">
      Offline mode — You are offline, but billing &amp; printing continue
      normally.{queueNote}
      {failedNote}
    </Alert>
  );
}
