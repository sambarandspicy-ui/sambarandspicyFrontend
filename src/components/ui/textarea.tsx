import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error, ...props }, ref) {
    const invalid = Boolean(error || props["aria-invalid"]);
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground transition-shadow outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          invalid &&
            "border-destructive focus:border-destructive focus:ring-destructive/25 focus-visible:border-destructive focus-visible:ring-destructive/25",
          className,
        )}
        {...props}
      />
    );
  },
);
