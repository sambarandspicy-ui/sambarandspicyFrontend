"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries";
import { useBillingSync } from "@/hooks/useBillingSync";
import { formatINR, getBusinessDateIST } from "@/lib/format";
import { api } from "@/services/api";

export function DailySales() {
  const [businessDate, setBusinessDate] = useState(() => getBusinessDateIST());
  const { queuedBills } = useBillingSync();

  useEffect(() => {
    const updateDate = () => setBusinessDate(getBusinessDateIST());
    const timer = window.setInterval(updateDate, 60_000);
    window.addEventListener("focus", updateDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateDate);
    };
  }, []);

  const sales = useQuery({
    queryKey: [...queryKeys.bills, "daily-sales", businessDate],
    queryFn: () => api.listBills({ from: businessDate, to: businessDate }),
    refetchInterval: 60_000,
  });

  const { totalSales, hasQueuedForToday } = useMemo(() => {
    const serverPaidBills = (sales.data ?? []).filter(
      (bill) => bill.status === "PAID" && bill.business_date === businessDate,
    );
    const seenClientIds = new Set<string>();
    const seenBillNumbers = new Set<string>();
    const seenCheckoutKeys = new Set<string>();

    let paise = 0;
    for (const bill of serverPaidBills) {
      paise += Math.round(bill.total_amount * 100);
      const clientId = bill.clientBillId ?? bill.client_bill_id;
      if (clientId) seenClientIds.add(clientId);
      if (bill.bill_number) seenBillNumbers.add(bill.bill_number);
      if (bill.checkout_key) seenCheckoutKeys.add(bill.checkout_key);
    }

    let queuedTodayCount = 0;
    for (const record of queuedBills) {
      const lb = record.localBill;
      if (lb.status !== "PAID" || lb.business_date !== businessDate) continue;
      const clientId = lb.clientBillId ?? lb.client_bill_id;
      if (clientId && seenClientIds.has(clientId)) continue;
      if (lb.bill_number && seenBillNumbers.has(lb.bill_number)) continue;
      if (lb.checkout_key && seenCheckoutKeys.has(lb.checkout_key)) continue;
      queuedTodayCount++;
      paise += Math.round(lb.total_amount * 100);
    }

    return {
      totalSales: paise / 100,
      hasQueuedForToday: queuedTodayCount > 0,
    };
  }, [sales.data, queuedBills, businessDate]);

  return (
    <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 text-sm sm:justify-end sm:gap-4 sm:px-6" aria-label="Today's sales">
      <span className="font-medium text-muted-foreground">Today&apos;s sales</span>
      <span className="text-right font-bold tabular-nums" role="status">
        {sales.isPending && !hasQueuedForToday
          ? "Loading..."
          : sales.isError && !hasQueuedForToday
            ? "Unavailable"
            : formatINR(totalSales)}
      </span>
    </div>
  );
}
