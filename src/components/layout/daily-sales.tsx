"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/queries";
import { formatINR, getBusinessDateIST } from "@/lib/format";
import { api } from "@/services/api";

export function DailySales() {
  const [businessDate, setBusinessDate] = useState(() => getBusinessDateIST());

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
    queryFn: async () => {
      const bills = await api.listBills({ from: businessDate, to: businessDate });
      return bills.filter((bill) => bill.status === "PAID" && bill.business_date === businessDate)
        .reduce((total, bill) => total + Math.round(bill.total_amount * 100), 0) / 100;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 text-sm sm:justify-end sm:gap-4 sm:px-6" aria-label="Today's sales">
      <span className="font-medium text-muted-foreground">Today&apos;s sales</span>
      <span className="text-right font-bold tabular-nums" role="status">
        {sales.isPending ? "Loading..." : sales.isError ? "Unavailable" : formatINR(sales.data)}
      </span>
    </div>
  );
}
