import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { InventoryItem, Notification } from "@/types/domain";
import { StatusBadge } from "@/components/shared/status-badge";
import { dateTime, qty } from "./shared";

export function RestockAlertsCard({
  alerts,
  items,
  admin,
  onRead,
  onRefresh,
  pending,
}: {
  alerts: Notification[];
  items: InventoryItem[];
  admin: boolean;
  onRead: (id: number) => void;
  onRefresh: () => void;
  pending: boolean;
}) {
  const open = alerts
    .filter(
      (x) =>
        x.status === "OPEN" &&
        items.some((i) => i.id === x.inventory_item_id && i.is_active),
    )
    .sort((a, b) =>
      a.severity === b.severity
        ? b.created_at.localeCompare(a.created_at)
        : a.severity === "CRITICAL"
          ? -1
          : 1,
    );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Restock alerts</h2>
          <p>Items at or below their stock limits.</p>
        </div>
        <Badge variant="info" className="tabular-nums">
          {open.length}
        </Badge>
      </div>
      {open.length === 0 ? (
        <div className="space-y-3 p-6 text-center text-sm text-muted-foreground sm:p-8">
          <p>All tracked ingredients are above minimum stock limits.</p>
          <Button variant="outline" onClick={onRefresh}>
            Refresh alerts
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {open.map((a) => (
            <div
              className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3.5"
              key={a.id}
            >
              <div className="space-y-1">
                <StatusBadge
                  tone={a.severity === "CRITICAL" ? "critical" : "warning"}
                >
                  {a.severity === "CRITICAL" ? "Critical" : "Low stock"}
                </StatusBadge>
                <strong className="block text-sm font-semibold text-foreground">
                  {a.message}
                </strong>
                <small className="block text-xs text-muted-foreground tabular-nums">
                  Quantity: {qty(a.triggered_qty)} · {dateTime(a.last_notified_at)}
                </small>
              </div>
              {admin && !a.read_at && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  loading={pending}
                  onClick={() => onRead(a.id)}
                >
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
