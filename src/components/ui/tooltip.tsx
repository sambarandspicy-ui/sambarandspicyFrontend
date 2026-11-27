"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Coords = {
  top: number;
  left: number;
  placement: "top" | "bottom";
};

function computeCoords(el: HTMLElement): Coords {
  const rect = el.getBoundingClientRect();
  const placement: "top" | "bottom" = rect.top < 44 ? "bottom" : "top";
  const top = placement === "top" ? rect.top - 8 : rect.bottom + 8;
  const rawLeft = rect.left + rect.width / 2;
  const maxWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const left = Math.min(Math.max(rawLeft, 24), Math.max(24, maxWidth - 24));
  return { top, left, placement };
}

export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<Coords>({ top: 0, left: 0, placement: "top" });
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const tooltipId = React.useId();

  function show() {
    if (!content) return;
    if (triggerRef.current) {
      setCoords(computeCoords(triggerRef.current));
    }
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  return (
    <span
      ref={triggerRef}
      className={cn("inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === "Escape") hide();
      }}
      aria-describedby={open ? tooltipId : undefined}
    >
      {children}
      {open &&
        content &&
        (typeof document !== "undefined"
          ? createPortal(
              <span
                id={tooltipId}
                role="tooltip"
                style={{ top: coords.top, left: coords.left }}
                className={cn(
                  "pointer-events-none fixed z-[90] -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#b99a46]/45 bg-[#092b16] px-2.5 py-1 text-xs font-semibold text-[#f7f5eb] shadow-lg transition-opacity duration-150 dark:bg-[#103b20] dark:text-[#fff9e9]",
                  coords.placement === "top" ? "-translate-y-full" : "translate-y-0",
                )}
              >
                {content}
              </span>,
              document.body,
            )
          : null)}
    </span>
  );
}

export function IconActionButton({
  icon,
  label,
  tooltip,
  onClick,
  disabled,
  loading,
  tone = "default",
  showLabelOnMobile = false,
  mobileLabel,
  className,
  type = "button",
  ...props
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "default" | "primary" | "danger";
  showLabelOnMobile?: boolean;
  mobileLabel?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick" | "type">) {
  const toneClasses = {
    default:
      "border-border bg-card text-foreground hover:border-[#b58a27]/45 hover:bg-muted",
    primary:
      "border-primary/25 bg-primary/5 text-primary hover:bg-primary/15 dark:border-[#ebc96f]/35 dark:bg-primary/20 dark:text-[#ebc96f]",
    danger:
      "border-border bg-card text-destructive hover:border-destructive/45 hover:bg-destructive/10 dark:hover:bg-destructive/20",
  };

  return (
    <Tooltip content={tooltip ?? label}>
      <Button
        type={type}
        variant="outline"
        size={showLabelOnMobile ? "sm" : "icon"}
        aria-label={label}
        disabled={disabled || loading}
        onClick={onClick}
        className={cn(
          showLabelOnMobile
            ? "min-h-10 gap-1.5 px-3 md:size-9 md:min-h-9 md:px-0"
            : "size-9 min-h-9 shrink-0 p-0",
          toneClasses[tone],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          <span className="inline-flex shrink-0 items-center justify-center" aria-hidden="true">
            {icon}
          </span>
        )}
        {showLabelOnMobile && (
          <span className="text-xs font-semibold md:hidden">
            {mobileLabel ?? tooltip ?? label}
          </span>
        )}
      </Button>
    </Tooltip>
  );
}
