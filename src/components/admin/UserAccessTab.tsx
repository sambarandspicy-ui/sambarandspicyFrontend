import { KeyRound, ShieldAlert, UserCheck, UserPen, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconActionButton } from "@/components/ui/tooltip";
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

  const roleBadge = {
    ADMIN: "success",
    BILLING: "warning",
    READ_ONLY: "info",
  } as const;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-foreground dark:border-[#ebc96f]/30 dark:bg-primary/20">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary dark:text-[#ebc96f]">
          <ShieldAlert size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>Fixed three-account license</strong>
          <p className="mt-1 text-muted-foreground">
            Exactly one account per role. No open signup or fourth user slot;
            the database enforces these fixed slots.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[...users]
          .sort((a, b) => a.id - b.id)
          .map((u) => (
            <Card className="admin-user-card flex flex-col justify-between space-y-4 p-5" key={u.id}>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={roleBadge[u.role]}>{u.role.replace("_", " ")}</Badge>
                  <StatusBadge tone={u.is_active ? "success" : "neutral"}>
                    {u.is_active ? "Active" : "Inactive"}
                  </StatusBadge>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{u.full_name}</h2>
                  <p className="text-sm text-muted-foreground">@{u.username}</p>
                </div>
                <div className="grid gap-1.5 border-y border-border py-3.5 text-sm text-muted-foreground">
                  <span>{scope[u.role]}</span>
                  <span className="text-xs tabular-nums">
                    Last login:{" "}
                    {u.last_login_at ? dateTime(u.last_login_at) : "Never"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconActionButton
                  icon={<UserPen size={16} />}
                  label="Edit details"
                  tooltip="Edit user"
                  mobileLabel="Edit details"
                  showLabelOnMobile
                  onClick={() => onEdit(u)}
                />
                <IconActionButton
                  icon={<KeyRound size={16} />}
                  label="Reset password"
                  tooltip="Reset password"
                  mobileLabel="Reset password"
                  showLabelOnMobile
                  onClick={() => onReset(u)}
                />
                {u.id !== 1 ? (
                  <IconActionButton
                    icon={u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                    label={u.is_active ? "Deactivate" : "Activate"}
                    tooltip={u.is_active ? "Deactivate user" : "Activate user"}
                    mobileLabel={u.is_active ? "Deactivate" : "Activate"}
                    tone={u.is_active ? "danger" : "primary"}
                    showLabelOnMobile
                    onClick={() => onToggle(u)}
                  />
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">
                    Admin account must remain active.
                  </p>
                )}
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
