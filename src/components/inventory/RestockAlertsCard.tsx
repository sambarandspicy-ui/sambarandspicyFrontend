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
    <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:text-base [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Restock alerts</h2>
          <p>Items at or below their stock limits.</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          {open.length}
        </span>
      </div>
      {open.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <p>All tracked ingredients are above minimum stock limits.</p>
          <Button variant="outline" className="min-h-11" onClick={onRefresh}>
            Refresh alerts
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {open.map((a) => (
            <div
              className="rounded-xl border border-border bg-muted p-3"
              key={a.id}
            >
              <div>
                <StatusBadge
                  tone={a.severity === "CRITICAL" ? "critical" : "warning"}
                >
                  {a.severity === "CRITICAL" ? "Critical" : "Low stock"}
                </StatusBadge>
                <strong>{a.message}</strong>
                <small>
                  Quantity: {qty(a.triggered_qty)} -{" "}
                  {dateTime(a.last_notified_at)}
                </small>
              </div>
              {admin && !a.read_at && (
                <Button
                  variant="outline"
                  disabled={pending}
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
