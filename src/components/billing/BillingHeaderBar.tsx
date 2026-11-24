import { History, Printer } from "lucide-react";
import type { UserRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
export function BillingHeaderBar({
  role,
  onPastBills,
  lastBillNumber,
  onLastReceipt,
}: {
  role: UserRole;
  onPastBills: () => void;
  lastBillNumber: string | null;
  onLastReceipt: () => void;
}) {
  return (
    <div className="min-w-0 max-w-full">
      <div className="flex min-w-0 max-w-full flex-wrap gap-2">
        {lastBillNumber && (
          <Button variant="outline" size="icon" className="size-11" onClick={onLastReceipt} aria-label={`Reprint Last Receipt (${lastBillNumber})`} title={`Reprint Last Receipt (${lastBillNumber})`}>
            <Printer size={18} aria-hidden="true" />
          </Button>
        )}
        {role !== "BILLING" && (
          <Button variant="outline" size="lg" onClick={onPastBills}>
            <History size={17} /> Past Bills
          </Button>
        )}
      </div>
    </div>
  );
}
