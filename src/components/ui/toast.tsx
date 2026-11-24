"use client";
import { useEffect, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Toast({
  message,
  onDismiss,
  variant = "success",
  duration = 5000,
}: {
  message: string;
  onDismiss: () => void;
  variant?: "success" | "warning" | "destructive" | "info";
  duration?: number;
}) {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(), duration);
    return () => window.clearTimeout(timer);
  }, [message, duration]);
  const icons = {
    success: CheckCircle2,
    warning: TriangleAlert,
    destructive: AlertCircle,
    info: Info,
  };
  const Icon = icons[variant];
  return (
    <div
      className={cn(
        "fixed right-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[80] flex w-[calc(100%-1.5rem)] max-w-sm items-center gap-3 rounded-xl border bg-card p-3 text-sm font-semibold text-card-foreground shadow-xl sm:right-5 sm:bottom-5",
        variant === "success" && "border-green-300",
        variant === "warning" && "border-amber-300",
        variant === "destructive" && "border-red-300",
        variant === "info" && "border-blue-300",
      )}
      role={variant === "destructive" ? "alert" : "status"}
    >
      <Icon size={18} aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        className="grid size-10 place-items-center rounded-lg hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}
