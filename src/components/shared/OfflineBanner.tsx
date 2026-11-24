"use client";
import { useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";

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
  return online ? null : (
    <Alert variant="warning" className="rounded-none text-center" role="status">
      You are offline. Your current cart stays here; retry when the connection
      returns.
    </Alert>
  );
}
