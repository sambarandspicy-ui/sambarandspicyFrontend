"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBillingSync } from "@/hooks/useBillingSync";
import { formatINR } from "@/lib/format";

function backupFilename(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `sambar-spicy-unsynced-bills-${part("year")}${part("month")}${part("day")}-${part("hour")}${part("minute")}.json`;
}

function formatBillTimeIST(iso: string): string {
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(iso) ? iso : `${iso}Z`;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function SyncQueueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    queuedBills,
    pendingCount,
    failedCount,
    isSyncing,
    syncNow,
    retryBill,
    retryAllFailed,
    exportBackupJson,
  } = useBillingSync();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const json = await exportBackupJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backupFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Offline Billing Sync Queue</DialogTitle>
          <DialogDescription>
            {queuedBills.length === 0
              ? "All bills created on this device have been synced to the server."
              : `${pendingCount} pending · ${failedCount} failed on this device.`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2">
          {queuedBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="size-8 text-emerald-500" aria-hidden="true" />
              <strong className="text-foreground">All bills synced</strong>
              <span>No queued or failed offline bills remain on this browser.</span>
            </div>
          ) : (
            queuedBills.map((record) => {
              const isFailed = record.syncStatus === "FAILED";
              const isRowSyncing = record.syncStatus === "SYNCING";
              return (
                <div
                  key={record.clientBillId}
                  className={`rounded-xl border p-3 text-sm ${
                    isFailed
                      ? "border-red-300 bg-red-50/70 dark:border-red-900 dark:bg-red-950/30"
                      : "border-border bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="block truncate">
                        {record.localBill.bill_number ?? record.clientBillId}
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {formatBillTimeIST(record.createdAt)} IST · Retries:{" "}
                        {record.retryCount}
                      </span>
                    </div>
                    <strong className="shrink-0 tabular-nums">
                      {formatINR(record.localBill.total_amount)}
                    </strong>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant={
                        isFailed
                          ? "destructive"
                          : isRowSyncing
                            ? "info"
                            : "warning"
                      }
                    >
                      {isFailed ? (
                        <AlertTriangle className="size-3" aria-hidden="true" />
                      ) : isRowSyncing ? (
                        <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <Clock className="size-3" aria-hidden="true" />
                      )}
                      {isFailed
                        ? "Failed"
                        : isRowSyncing
                          ? "Syncing"
                          : "Pending"}
                    </Badge>

                    {isFailed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void retryBill(record.clientBillId)}
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Retry
                      </Button>
                    )}
                  </div>

                  {record.lastError && (
                    <p
                      className={`mt-2 text-xs ${
                        isFailed
                          ? "font-medium text-red-700 dark:text-red-300"
                          : "text-muted-foreground"
                      }`}
                      role={isFailed ? "alert" : undefined}
                    >
                      {record.lastError}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </DialogBody>

        <DialogFooter className="sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || queuedBills.length === 0}
            onClick={() => void handleExport()}
          >
            <Download className="size-4" aria-hidden="true" />
            Export JSON Backup
          </Button>
          <div className="flex flex-wrap gap-2">
            {failedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void retryAllFailed()}
              >
                Retry All Failed
              </Button>
            )}
            <Button
              size="sm"
              loading={isSyncing}
              disabled={queuedBills.length === 0}
              leftIcon={!isSyncing ? <RefreshCw className="size-4" aria-hidden="true" /> : undefined}
              onClick={() => void syncNow()}
            >
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
