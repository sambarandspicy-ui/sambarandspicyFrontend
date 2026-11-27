import { Ban, History, Printer } from "lucide-react";
import type { UserRole } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function BillingHeaderBar({
  role,
  onPastBills,
  lastBillNumber,
  onLastReceipt,
  canCancelLastBill = false,
  onCancelLastBill,
}: {
  role: UserRole;
  onPastBills: () => void;
  lastBillNumber: string | null;
  onLastReceipt: () => void;
  canCancelLastBill?: boolean;
  onCancelLastBill?: () => void;
}) {
  return (
    <div className="min-w-0 max-w-full">
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 sm:gap-2">
        {lastBillNumber && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="min-h-10"
              onClick={onLastReceipt}
              aria-label={`Reprint Last Receipt (${lastBillNumber})`}
              title={`Reprint Last Receipt (${lastBillNumber})`}
            >
              <Printer size={17} aria-hidden="true" />
            </Button>
            {canCancelLastBill && onCancelLastBill && (
              <Button
                variant="outline"
                size="icon"
                className="min-h-10 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onCancelLastBill}
                aria-label={`Cancel Last Bill (${lastBillNumber})`}
                title={`Cancel Last Bill (${lastBillNumber})`}
              >
                <Ban size={17} aria-hidden="true" />
              </Button>
            )}
          </>
        )}
        {role !== "BILLING" && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 px-3"
            leftIcon={<History size={16} aria-hidden="true" />}
            onClick={onPastBills}
          >
            Past Bills
          </Button>
        )}
      </div>
    </div>
  );
}
