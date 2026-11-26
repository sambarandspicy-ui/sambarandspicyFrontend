import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  description,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const helperText = hint ?? description;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        <Label
          htmlFor={htmlFor}
          className="inline-flex items-center text-sm font-semibold text-foreground"
        >
          {label}
        </Label>
        {required && (
          <span aria-hidden="true" className="text-sm font-semibold text-destructive">
            *
          </span>
        )}
      </div>
      {children}
      {helperText && (
        <p id={htmlFor + "-hint"} className="text-xs leading-relaxed text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={htmlFor + "-error"}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
