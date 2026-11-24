import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { dateTime } from "@/components/inventory/shared";
import type { User } from "@/types/domain";
export function UserAccessTab({
  users,
  onEdit,
  onReset,
  onToggle,
}: {
  users: User[];
  onEdit: (u: User) => void;
  onReset: (u: User) => void;
  onToggle: (u: User) => void;
}) {
  const scope = {
    ADMIN: "Full system control",
    BILLING: "Counter billing only",
    READ_ONLY: "Read-only access + report exports",
  };
  return (
    <>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <strong>Fixed three-account license</strong>
        <p>
          Exactly one account per role. No open signup or fourth user slot; the
          database enforces these fixed slots.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...users]
          .sort((a, b) => a.id - b.id)
          .map((u) => (
            <Card className="admin-user-card space-y-4 p-5" key={u.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">
                  {u.role.replace("_", " ")}
                </span>
                <StatusBadge tone={u.is_active ? "success" : "neutral"}>
                  {u.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              </div>
              <h2>{u.full_name}</h2>
              <p>@{u.username}</p>
              <div className="grid gap-2 border-y border-border py-4 text-sm text-muted-foreground">
                <span>{scope[u.role]}</span>
                <span>
                  Last login:{" "}
                  {u.last_login_at ? dateTime(u.last_login_at) : "Never"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onEdit(u)}
                >
                  Edit details
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onReset(u)}
                >
                  Reset password
                </Button>
                {u.id !== 1 ? (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => onToggle(u)}
                  >
                    {u.is_active ? "Deactivate" : "Activate"}
                  </Button>
                ) : (
                  <p>Admin account must remain active.</p>
                )}
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
