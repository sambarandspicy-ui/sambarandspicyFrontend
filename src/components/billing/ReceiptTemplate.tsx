import type { BillDetail } from "@/types/domain";
import { formatINR } from "@/lib/format";
function ReceiptRule() {
  return <svg className="receipt-rule" viewBox="0 0 100 3" preserveAspectRatio="none" aria-hidden="true"><path d="M0 1.5H100" stroke="#000" strokeWidth="3" /></svg>;
}
export function maskReference(value: string) {
  const visible = value.replace(/[^A-Za-z0-9]/g, "").slice(-4);
  return visible ? `****${visible}` : "****";
}
export function ReceiptTemplate({
  bill,
  isReprint = false,
  footer = "Thank you for visiting! Come again.",
}: {
  bill: BillDetail;
  isReprint?: boolean;
  footer?: string | null;
}) {
  const payment = bill.payment;
  const totalQuantity = bill.items.reduce((sum, item) => sum + Number(item.quantity), 0);
  return (
    <article
      className="receipt-paper"
      id="print-receipt"
    >
      <header className="receipt-store">
        {isReprint && <p className="receipt-reprint">REPRINT</p>}
        {/* Previous icon and store-name heading, retained for restoration:
        <svg className="receipt-logo" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 29c-8 1-12 4-12 7 0 4 8 7 18 7s18-3 18-7c0-3-4-6-12-7" />
          <path d="M17 29c-4-6 4-8 0-14-2-3 0-6 2-9M25 29c-4-7 4-9 0-16-2-3-1-7 1-10M33 29c-3-6 3-8 0-14-2-3-1-6 1-8" />
        </svg>
        <h2>{bill.store_name_snapshot}</h2> */}
        {/* A plain image also works in the isolated browser print document. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="receipt-logo" src="/images/receipt-logo.png" alt={bill.store_name_snapshot ?? "Sambar & Spicy"} />
        {bill.store_address_snapshot && <p>{bill.store_address_snapshot}</p>}
        {bill.store_phone_snapshot && <p>☎ {bill.store_phone_snapshot}</p>}
      </header>
      <ReceiptRule />
      <div className="receipt-meta">
        <p>
          <strong>Bill No:</strong> {bill.bill_number}
        </p>
        <p>
          <strong>Date:</strong> {bill.paid_at
            ? new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(
                new Date(
                  /(?:Z|[+-]\d{2}:\d{2})$/i.test(bill.paid_at)
                    ? bill.paid_at
                    : `${bill.paid_at}Z`,
                ),
              )
            : ""}{" "}
          IST
        </p>
        <p>
          <strong>Cashier:</strong>{" "}
          {bill.cashier_name ?? `User #${bill.paid_by ?? bill.created_by}`}
        </p>
      </div>
      <ReceiptRule />
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty x Rate</th>
            <th>Amount</th>
          </tr>
          <tr><th colSpan={3} className="receipt-rule-cell"><ReceiptRule /></th></tr>
        </thead>
        <tbody>
          {bill.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.item_name_snapshot}
                {item.portion === "HALF" ? " (Half)" : ""}
              </td>
              <td>
                {item.quantity} x {formatINR(item.unit_price)}
              </td>
              <td>{formatINR(item.line_net_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ReceiptRule />
      <div className="receipt-totals">
        <p><span>Total quantity</span><span>{totalQuantity}</span></p>
        <p>
          <span>Subtotal</span>
          <span>{formatINR(bill.subtotal_amount)}</span>
        </p>
        {bill.discount_amount > 0 && (
          <p>
            <span>Discount</span>
            <span>-{formatINR(bill.discount_amount)}</span>
          </p>
        )}
        {(bill.round_off_amount ?? 0) !== 0 && (
          <p><span>Round off</span><span>{(bill.round_off_amount ?? 0) < 0 ? "-" : "+"}{formatINR(Math.abs(bill.round_off_amount ?? 0))}</span></p>
        )}
        <ReceiptRule />
        <p className="receipt-total">
          <strong>TOTAL</strong>
          <strong>{formatINR(bill.total_amount)}</strong>
        </p>
        <ReceiptRule />
      </div>
      {payment && (
        <div className="receipt-payment">
          <div>Payment: {payment.payment_method}
          {payment.payment_method === "CASH" ? (
            <>
              {" "}
              | Tendered: {formatINR(payment.tendered_amount)}
            </>
          ) : payment.reference_number ? (
            <> | Ref: {maskReference(payment.reference_number)}</>
          ) : null}</div>
          {payment.payment_method === "CASH" && <div>Change: {formatINR(payment.change_amount)}</div>}
        </div>
      )}
      <ReceiptRule />
      <footer>
        <p>Non-GST counter receipt</p>
        {footer && <p>{footer}</p>}
        <p className="receipt-stars" aria-hidden="true">**************************</p>
      </footer>
    </article>
  );
}
