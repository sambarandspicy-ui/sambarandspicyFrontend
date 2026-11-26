"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Banknote, Check, CreditCard, Printer, WalletCards, X } from "lucide-react";
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
        showClose={false}
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-3 sm:max-h-[90dvh] sm:w-full sm:p-5"
        onEscapeKeyDown={(e) => {
          if (uncertain || pending) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (uncertain || pending) e.preventDefault();
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 [&_h2]:text-lg [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
          <div>
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>
              Review the bill and choose how the customer paid.
            </DialogDescription>
          </div>
          {!uncertain && (
            <DialogClose asChild>
              <Button
                variant="outline"
                className="size-11 p-0"
                aria-label="Close checkout"
                disabled={pending}
              >
                <X size={18} />
              </Button>
            </DialogClose>
          )}
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void handleSubmit((values) => submit(values, true))(e)}
        >
          <div className="pos-scroll min-h-0 flex-1 space-y-4 overflow-y-auto py-3 pr-1 sm:py-4 [&_fieldset]:space-y-3 [&_fieldset]:border-0 [&_label]:text-sm [&_label]:font-semibold">
            <div className="space-y-3 rounded-xl border border-border bg-muted p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm [&_strong]:text-xl [&_strong]:tabular-nums sm:[&_strong]:text-2xl">
                <span>Grand Total Payable</span>
                <strong>{formatINR(cart.totals.total)}</strong>
              </div>
              <div className="flex items-center justify-between text-sm">
                <strong>Order summary</strong>
                <span>
                  {cart.totals.count}{" "}
                  {cart.totals.count === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="hidden sm:block">{orderLines}</div>
              <details className="sm:hidden">
                <summary>View order items</summary>
                {orderLines}
              </details>
              <div className="flex justify-between border-t border-border pt-2 text-sm">
                <span>Subtotal</span>
                <strong>{formatINR(cart.totals.subtotal)}</strong>
              </div>
              {cart.totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Discount</span>
                  <span>-{formatINR(cart.totals.discount)}</span>
                </div>
              )}
              {cart.state.roundOff && cart.totals.canRound && (
                <div className="flex justify-between text-sm"><span>Round off</span><strong>{cart.totals.roundOff < 0 ? "-" : "+"}{formatINR(Math.abs(cart.totals.roundOff))}</strong></div>
              )}
            </div>
            <fieldset className="min-w-0" disabled={pending || uncertain}>
              <legend className="text-sm font-semibold">Payment mode</legend>
              <div className="grid grid-cols-3 gap-2 [&_button]:min-h-11">
                {(
                  [
                    { id: "CASH", Icon: Banknote },
                    { id: "UPI", Icon: WalletCards },
                    { id: "CARD", Icon: CreditCard },
                  ] as const
                ).map(({ id: m, Icon }) => (
                  <Button
                    variant="outline"
                    key={m}
                    type="button"
                    aria-pressed={method === m}
                    className={
                      method === m
                        ? "min-h-11 min-w-0 gap-1 px-1 border-primary bg-primary/10 text-primary sm:gap-2 sm:px-4"
                        : "min-h-11 min-w-0 gap-1 px-1 sm:gap-2 sm:px-4"
                    }
                    onClick={() => switchMode(m)}
                  >
                    <Icon size={17} aria-hidden="true" />
                    {m}
                  </Button>
                ))}
              </div>
              {method === "CASH" ? (
                <>
                  <label htmlFor="tendered">Tendered amount</label>
                  <Input
                    id="tendered"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    {...register("tendered", { valueAsNumber: true })}
                  />
                  {errors.tendered && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.tendered.message}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 [&_button]:min-h-11">
                    {quick.map((x) => (
                      <Button
                        variant="outline"
                        type="button"
                        key={x.label}
                        aria-pressed={
                          Number.isFinite(tendered) && tendered === x.value
                        }
                        onClick={() =>
                          setValue("tendered", x.value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        {x.label}
                      </Button>
                    ))}
                  </div>
                  <div
                    className={`flex justify-between rounded-xl border p-3 font-semibold ${Number.isFinite(tendered) && tendered < cart.totals.total ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-800"}`}
                  >
                    <span>
                      {Number.isFinite(tendered) && tendered < cart.totals.total
                        ? "Shortfall"
                        : "Change due"}
                    </span>
                    <strong>
                      {formatINR(
                        Number.isFinite(tendered)
                          ? Math.abs(tendered - cart.totals.total)
                          : 0,
                      )}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <label htmlFor="payment-reference">
                    Reference number <span>Optional</span>
                  </label>
                  <Input
                    id="payment-reference"
                    placeholder="UTR or last digits"
                    {...register("reference")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Do not enter full card numbers, PAN or CVV.
                  </p>
                  {errors.reference && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.reference.message}
                    </p>
                  )}
                  <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border p-3 text-sm leading-5 focus-within:ring-2 focus-within:ring-ring">
                    <input
                      className="mt-0.5 size-5 shrink-0 accent-blue-600"
                      type="checkbox"
                      {...register("confirmed")}
                    />
                    <span>I confirm payment has been received externally</span>
                  </label>
                  {errors.confirmed && (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.confirmed.message}
                    </p>
                  )}
                </>
              )}
              <label htmlFor="checkout-note">
                Bill note <span>Optional</span>
              </label>
              <Input id="checkout-note" maxLength={255} {...register("note")} />
            </fieldset>
            {stale && !uncertain && (
              <p className="text-sm text-destructive" role="alert">
                A menu price or availability changed. Remove and re-add the
                affected item before checkout.
              </p>
            )}
            {error && (
              <div
                className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:flex-wrap sm:justify-end">
            {!uncertain && (
              <DialogClose asChild>
                <Button
                  variant="outline"
                  className="min-h-11 min-w-0 px-2 sm:px-4"
                  type="button"
                  disabled={pending}
                >
                  Back to cart
                </Button>
              </DialogClose>
            )}
            {uncertain ? (
              <Button
                variant="outline"
                type="button"
                className="col-span-2 min-h-11 bg-primary text-white sm:w-auto"
                disabled={pending}
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
                  variant="default"
                  type="button"
                  className="min-h-11 min-w-0 px-2 sm:px-4"
                  disabled={pending || stale}
                  onClick={() =>
                    void handleSubmit((values) => submit(values, false))()
                  }
                >
                  <Check size={17} aria-hidden="true" />
                  {pending && activeAction === "save"
                    ? "Saving..."
                    : "Save payment"}
                </Button>
                <Button
                  variant="success"
                  type="submit"
                  className="col-span-2 min-h-11 min-w-0 px-2 sm:col-span-1 sm:px-4"
                  disabled={pending || stale}
                >
                  <Printer size={17} aria-hidden="true" />
                  {pending && activeAction === "print"
                    ? "Processing..."
                    : "Payment & Print"}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
