"use client";
import * as React from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  prefixText?: string;
  suffixText?: string;
  clearable?: boolean;
  onClear?: () => void;
  clearLabel?: string;
  error?: boolean;
  showPasswordToggle?: boolean;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      className,
      containerClassName,
      type,
      leadingIcon,
      trailingIcon,
      prefixText,
      suffixText,
      clearable,
      onClear,
      clearLabel = "Clear input",
      error,
      showPasswordToggle,
      disabled,
      value,
      defaultValue,
      ...props
    },
    ref,
  ) {
    const [revealed, setRevealed] = React.useState(false);
    const isPassword = type === "password";
    const resolvedType =
      isPassword && showPasswordToggle ? (revealed ? "text" : "password") : type;
    const isCheckOrRadio = type === "checkbox" || type === "radio";
    const hasPasswordToggle = Boolean(isPassword && showPasswordToggle);
    const hasValue =
      typeof value === "string"
        ? value.length > 0
        : typeof value === "number"
          ? true
          : typeof defaultValue === "string"
            ? defaultValue.length > 0
            : false;
    const showClear = Boolean(clearable && !disabled && (hasValue || onClear) && hasValue);
    const hasAdornments = Boolean(
      leadingIcon ||
        trailingIcon ||
        prefixText ||
        suffixText ||
        clearable ||
        hasPasswordToggle,
    );
    const invalid = Boolean(error || props["aria-invalid"]);

    if (isCheckOrRadio) {
      return (
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      );
    }

    if (!hasAdornments) {
      return (
        <input
          ref={ref}
          type={resolvedType}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground transition-shadow outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:text-sm",
            invalid &&
              "border-destructive focus:border-destructive focus:ring-destructive/25 focus-visible:border-destructive focus-visible:ring-destructive/25",
            className,
          )}
          {...props}
        />
      );
    }

    return (
      <div
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-base text-foreground transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 sm:h-10 sm:text-sm",
          disabled && "cursor-not-allowed opacity-50",
          invalid &&
            "border-destructive focus-within:border-destructive focus-within:ring-destructive/25",
          containerClassName,
        )}
      >
        {leadingIcon && (
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center text-muted-foreground"
          >
            {leadingIcon}
          </span>
        )}
        {prefixText && (
          <span
            aria-hidden="true"
            className="shrink-0 select-none text-sm font-medium text-muted-foreground"
          >
            {prefixText}
          </span>
        )}
        <input
          ref={ref}
          type={resolvedType}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "min-w-0 flex-1 border-none bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-0 disabled:cursor-not-allowed sm:text-sm",
            className,
          )}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={onClear}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
        {hasPasswordToggle && (
          <button
            type="button"
            aria-label={revealed ? "Hide password" : "Show password"}
            onClick={() => setRevealed((prev) => !prev)}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {revealed ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
        {suffixText && (
          <span
            aria-hidden="true"
            className="shrink-0 select-none text-xs font-medium text-muted-foreground sm:text-sm"
          >
            {suffixText}
          </span>
        )}
        {trailingIcon && (
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center text-muted-foreground"
          >
            {trailingIcon}
          </span>
        )}
      </div>
    );
  },
);

export { NativeSelect as Select } from "./select";
export { Textarea } from "./textarea";
