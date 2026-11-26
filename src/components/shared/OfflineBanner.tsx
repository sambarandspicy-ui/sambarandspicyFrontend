"use client";
import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
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
    <Alert
      variant="warning"
      className="flex items-center justify-center gap-2 rounded-none border-x-0 border-t-0 border-[#b58a27]/40 bg-[#f3ecda] px-3 py-2 text-center text-xs font-medium text-[#5c420c] sm:text-sm dark:border-[#ebc96f]/30 dark:bg-[#281f0a] dark:text-[#f8e19d]"
      role="status"
    >
      <WifiOff size={15} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">
        Offline mode — You are offline, but billing &amp; printing continue
        normally.{queueNote}
        {failedNote}
      </span>
    </Alert>
  );
}
