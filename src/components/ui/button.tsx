import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        success: "bg-success text-white shadow-xs hover:bg-success/90",
        warning: "bg-warning text-white shadow-xs hover:bg-warning/90",
        secondary:
          "border border-border/60 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        subtle: "bg-accent text-accent-foreground hover:bg-accent/80",
        outline:
          "border border-border bg-card text-foreground shadow-2xs hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "min-h-11 px-4 py-2 sm:min-h-10",
        sm: "min-h-9 rounded-lg px-3 text-xs sm:text-sm",
        lg: "min-h-12 px-6 text-base",
        icon: "h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type,
      ...props
    },
    ref,
  ) {
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        type={type ?? "button"}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);
