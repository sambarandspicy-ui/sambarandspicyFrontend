"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Banknote, Check, CreditCard, Printer, WalletCards } from "lucide-react";
import type { BillingCart } from "@/hooks/useBillingCart";
import type { CheckoutInput } from "@/services/api/types";
import type {
  BillDetail,
  Category,
  MenuItem,
  PaymentMethod,
} from "@/types/domain";
import { formatINR } from "@/lib/format";
import { ApiError } from "@/types/api";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    method: z.enum(["CASH", "UPI", "CARD"]),
    tendered: z.number().finite().nonnegative(),
    reference: z
      .string()
      .max(100)
      .refine(
        (x) => !/(?:\d[ -]?){13,}/.test(x),
        "Do not enter a full card number.",
      ),
    confirmed: z.boolean(),
    note: z.string().max(255),
  })
  .superRefine((x, ctx) => {
    if (x.method !== "CASH" && !x.confirmed)
      ctx.addIssue({
        code: "custom",
        path: ["confirmed"],
        message: "Confirm that payment was received externally.",
      });
  });

type Values = z.infer<typeof schema>;

export function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  menu,
  categories,
  onCheckout,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: BillingCart;
  menu: MenuItem[];
  categories: Category[];
  onCheckout: (
    input: CheckoutInput,
    options?: { print?: boolean },
  ) => Promise<BillDetail>;
  pending: boolean;
}) {
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [activeAction, setActiveAction] = useState<"save" | "print" | null>(null);
  const attempt = useRef<{ input: CheckoutInput; print: boolean } | null>(null);
  const submitted = useRef(false);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError: fieldError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: cart.state.paymentMethod,
      tendered: cart.totals.total,
      reference: "",
      confirmed: false,
      note: cart.state.note,
    },
  });
  const method = useWatch({ control, name: "method" });
  const tendered = useWatch({ control, name: "tendered" });

  const stale = cart.state.items.some((x) => {
    const current = menu.find((m) => m.id === x.menuItemId);
    return (
      !current ||
      !current.is_available ||
      !categories.some((c) => c.id === current.category_id && c.is_active) ||
      (x.portion === "HALF" &&
        (!current.has_half_portion || current.half_selling_price == null)) ||
      (x.portion === "HALF"
        ? current.half_selling_price
        : current.selling_price) !== x.unitPrice
    );
  });

  function switchMode(next: PaymentMethod) {
    setValue("method", next);
    cart.setPayment(next);
    setValue("tendered", cart.totals.total);
    setValue("confirmed", false);
  }

  async function run(input: CheckoutInput, printReceipt: boolean) {
    if (submitted.current) return;
    submitted.current = true;
    setActiveAction(printReceipt ? "print" : "save");
    setError("");
    try {
      await onCheckout(input, { print: printReceipt });
      onOpenChange(false);
    } catch (e) {
      const known = e instanceof ApiError && e.status >= 400 && e.status < 500;
      setUncertain(!known);
      if (known) attempt.current = null;
      setError(
        known
          ? e.message
          : "Checkout result could not be confirmed. Retry with the same request to avoid a duplicate.",
      );
    } finally {
      submitted.current = false;
      setActiveAction(null);
    }
  }

  async function submit(values: Values, printReceipt = true) {
    if (submitted.current) return;
    if (stale) {
      setError(
        "A menu price or availability changed. Remove and re-add the affected item before checkout.",
      );
      return;
    }
    if (
      values.method === "CASH" &&
      Math.round(values.tendered * 100) < Math.round(cart.totals.total * 100)
    ) {
      fieldError("tendered", {
        message: "Tendered amount must cover the total.",
      });
      return;
    }
    if (!cart.state.checkoutKey) {
      setError("Checkout key is missing. Please rebuild the cart.");
      return;
    }
    const input: CheckoutInput = {
      checkout_key: cart.state.checkoutKey,
      bill_id: cart.state.resumedBillId ?? undefined,
      hold_label: cart.state.holdLabel || null,
      items: cart.state.items.map((i) => ({
        menu_item_id: i.menuItemId,
        portion: i.portion,
        expected_unit_price: i.unitPrice,
        quantity: i.quantity,
        line_discount_amount: i.lineDiscount,
      })),
      payment_method: values.method,
      round_off: cart.state.roundOff && cart.totals.canRound,
      tendered_amount:
        values.method === "CASH" ? values.tendered : cart.totals.total,
      reference_number:
        values.method === "CASH" ? null : values.reference.trim() || null,
      note: values.note.trim() || null,
    };
    attempt.current = { input, print: printReceipt };
    await run(input, printReceipt);
  }

  const quick = [
    { label: "Exact", value: cart.totals.total },
    ...[100, 200, 500, 2000].map((n) => ({
      label: formatINR(n, { compact: true }),
      value: n,
    })),
  ];

  const orderLines = (
    <div
      className="pos-scroll max-h-32 space-y-2 overflow-y-auto text-sm sm:max-h-44 [&>div]:flex [&>div]:justify-between [&>div]:gap-2"
      role="region"
      aria-label="Order items"
      tabIndex={0}
    >
      {cart.state.items.map((i) => (
        <div key={`${i.menuItemId}:${i.portion}`}>
          <span className="min-w-0 break-words">
            {i.quantity} x {i.name} ({i.portion === "HALF" ? "Half" : "Full"})
          </span>
          <strong className="shrink-0 tabular-nums">
            {formatINR(
              (Math.round(i.unitPrice * 100) * i.quantity -
                Math.round(i.lineDiscount * 100)) /
                100,
            )}
          </strong>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!pending && (!uncertain || v)) onOpenChange(v);
      }}
    >
      <DialogContent
        showClose={!uncertain}
        className="w-[calc(100vw-1rem)] sm:max-w-2xl"
        onEscapeKeyDown={(e) => {
          if (uncertain || pending) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (uncertain || pending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Confirm payment</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Review the bill and choose how the customer paid.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
          onSubmit={(e) => void handleSubmit((values) => submit(values, true))(e)}
        >
          <DialogBody className="space-y-4 [&_fieldset]:space-y-3.5 [&_fieldset]:border-0">
            <div className="space-y-3 rounded-xl border border-border bg-secondary/70 p-3.5 sm:p-4 dark:bg-muted/60">
              <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm [&_strong]:text-xl [&_strong]:tabular-nums sm:[&_strong]:text-2xl">
                <span className="font-semibold">Grand Total Payable</span>
                <strong className="text-primary dark:text-[#ebc96f]">
                  {formatINR(cart.totals.total)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-sm">
                <strong>Order summary</strong>
                <span className="text-muted-foreground tabular-nums">
                  {cart.totals.count} {cart.totals.count === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="hidden sm:block">{orderLines}</div>
              <details className="sm:hidden">
                <summary className="cursor-pointer text-sm font-medium text-primary dark:text-[#ebc96f]">
                  View order items
                </summary>
                <div className="mt-2">{orderLines}</div>
              </details>
              <div className="flex justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <strong className="tabular-nums">
                  {formatINR(cart.totals.subtotal)}
                </strong>
              </div>
              {cart.totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums">
                    -{formatINR(cart.totals.discount)}
                  </span>
                </div>
              )}
              {cart.state.roundOff && cart.totals.canRound && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Round off</span>
                  <strong className="tabular-nums">
                    {cart.totals.roundOff < 0 ? "-" : "+"}
                    {formatINR(Math.abs(cart.totals.roundOff))}
                  </strong>
                </div>
              )}
            </div>

            <fieldset className="min-w-0" disabled={pending || uncertain}>
              <legend className="text-sm font-semibold text-foreground">
                Payment mode
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "CASH", Icon: Banknote },
                    { id: "UPI", Icon: WalletCards },
                    { id: "CARD", Icon: CreditCard },
                  ] as const
                ).map(({ id: m, Icon }) => {
                  const selected = method === m;
                  return (
                    <Button
                      variant="outline"
                      key={m}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "min-h-11 min-w-0 gap-1.5 px-2 sm:px-4",
                        selected &&
                          "border-primary bg-primary/10 text-primary ring-1 ring-[#b58a27]/40 dark:bg-primary/25 dark:text-[#ebc96f]",
                      )}
                      onClick={() => switchMode(m)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      <span>{m}</span>
                    </Button>
                  );
                })}
              </div>

              {method === "CASH" ? (
                <div className="space-y-3">
                  <FormField
                    label="Tendered amount"
                    htmlFor="tendered"
                    error={errors.tendered?.message}
                  >
                    <Input
                      id="tendered"
                      type="number"
                      inputMode="decimal"
                      prefixText="₹"
                      min="0"
                      step="0.01"
                      error={Boolean(errors.tendered)}
                      {...register("tendered", { valueAsNumber: true })}
                    />
                  </FormField>

                  <div className="flex flex-wrap gap-2">
                    {quick.map((x) => {
                      const activeQuick =
                        Number.isFinite(tendered) && tendered === x.value;
                      return (
                        <Button
                          variant={activeQuick ? "default" : "outline"}
                          size="default"
                          type="button"
                          key={x.label}
                          aria-pressed={activeQuick}
                          onClick={() =>
                            setValue("tendered", x.value, {
                              shouldValidate: true,
                            })
                          }
                        >
                          {x.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div
                    className={cn(
                      "flex justify-between rounded-xl border p-3 text-sm font-semibold",
                      Number.isFinite(tendered) && tendered < cart.totals.total
                        ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/70 dark:text-red-200"
                        : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200",
                    )}
                  >
                    <span>
                      {Number.isFinite(tendered) && tendered < cart.totals.total
                        ? "Shortfall"
                        : "Change due"}
                    </span>
                    <strong className="tabular-nums">
                      {formatINR(
                        Number.isFinite(tendered)
                          ? Math.abs(tendered - cart.totals.total)
                          : 0,
                      )}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <FormField
                    label="Reference number (Optional)"
                    htmlFor="payment-reference"
                    hint="Do not enter full card numbers, PAN or CVV."
                    error={errors.reference?.message}
                  >
                    <Input
                      id="payment-reference"
                      placeholder="UTR or last digits"
                      error={Boolean(errors.reference)}
                      {...register("reference")}
                    />
                  </FormField>

                  <label className="flex min-h-11 items-start gap-3 rounded-xl border border-input bg-card p-3 text-sm leading-5 focus-within:ring-2 focus-within:ring-ring">
                    <Input
                      className="mt-0.5 size-5"
                      type="checkbox"
                      {...register("confirmed")}
                    />
                    <span>I confirm payment has been received externally</span>
                  </label>
                  {errors.confirmed && (
                    <p className="text-sm font-medium text-destructive" role="alert">
                      {errors.confirmed.message}
                    </p>
                  )}
                </div>
              )}

              <FormField label="Bill note (Optional)" htmlFor="checkout-note">
                <Input id="checkout-note" maxLength={255} {...register("note")} />
              </FormField>
            </fieldset>

            {stale && !uncertain && (
              <p className="text-sm font-medium text-destructive" role="alert">
                A menu price or availability changed. Remove and re-add the
                affected item before checkout.
              </p>
            )}
            {error && (
              <div
                className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/70 dark:text-red-200"
                role="alert"
              >
                {error}
              </div>
            )}
          </DialogBody>

          <DialogFooter className="grid grid-cols-2 gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex sm:flex-wrap sm:justify-end sm:px-6 sm:py-3.5">
            {!uncertain && (
              <DialogClose asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="min-w-0 px-2 sm:px-4"
                  type="button"
                  disabled={pending}
                >
                  Back to cart
                </Button>
              </DialogClose>
            )}
            {uncertain ? (
              <Button
                variant="default"
                size="default"
                type="button"
                className="col-span-2 sm:w-auto"
                loading={pending}
                onClick={() => {
                  if (attempt.current) {
                    void run(attempt.current.input, attempt.current.print);
                  }
                }}
              >
                {pending ? "Processing..." : "Retry Checkout"}
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="default"
                  type="button"
                  className="min-w-0 px-2 sm:px-4"
                  loading={pending && activeAction === "save"}
                  disabled={pending || stale}
                  leftIcon={<Check size={16} aria-hidden="true" />}
                  onClick={() =>
                    void handleSubmit((values) => submit(values, false))()
                  }
                >
                  {pending && activeAction === "save"
                    ? "Saving..."
                    : "Save payment"}
                </Button>
                <Button
                  variant="default"
                  size="default"
                  type="submit"
                  className="col-span-2 min-w-0 px-2 sm:col-span-1 sm:px-4"
                  loading={pending && activeAction === "print"}
                  disabled={pending || stale}
                  leftIcon={<Printer size={16} aria-hidden="true" />}
                >
                  {pending && activeAction === "print"
                    ? "Processing..."
                    : "Payment & Print"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
