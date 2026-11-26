"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

import { useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { AuditLog, User } from "@/types/domain";
import { getBusinessDateIST } from "@/lib/format";
import { dateTime } from "@/components/inventory/shared";
import { redactAuditValue } from "@/lib/audit";
export function AuditHistoryTab({
  logs,
  users,
}: {
  logs: AuditLog[];
  users: User[];
}) {
  const [entity, setEntity] = useState("ALL");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [inspect, setInspect] = useState<AuditLog | null>(null);
  const rows = logs
    .filter((x) => {
      const actor = users.find((u) => u.id === x.actor_user_id);
      return (
        (entity === "ALL" || x.entity_type.toUpperCase() === entity) &&
        (!date || getBusinessDateIST(new Date(x.created_at)) === date) &&
        `${x.action} ${x.entity_id ?? ""} ${actor?.full_name ?? ""} ${actor?.username ?? ""} ${actor?.role ?? ""}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      );
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
        <div>
          <h2>Audit history</h2>
          <p>Read-only record of administrative activity.</p>
        </div>
      </div>
      <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2 lg:grid-cols-3 [&_label]:text-sm [&_label]:font-semibold [&_input]:mt-2 [&_select]:mt-2">
        <label>
          Entity type
          <NativeSelect
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
          >
            {[
              "ALL",
              "STORE_SETTINGS",
              "CATEGORY",
              "MENU_ITEM",
              "BILL",
              "INVENTORY_ITEM",
              "OPERATING_EXPENSE",
              "USER",
            ].map((x) => (
              <option key={x} value={x}>
                {x === "ALL" ? "All entities" : x.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label>
          Search
          <Input
            placeholder="Action, entity ID, or actor"
            leadingIcon={<Search size={16} />}
            clearable
            onClear={() => setSearch("")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Business date (IST)
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((x) => {
          const actor = users.find((u) => u.id === x.actor_user_id);
          return (
            <article key={x.id} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Badge variant="outline" className="text-[11px]">{x.entity_type.toUpperCase()} #{x.entity_id ?? "-"}</Badge>
                  <p className="mt-1.5 font-semibold text-sm">{x.action}</p>
                </div>
                <Button variant="outline" size="sm" className="min-h-10 shrink-0" onClick={() => setInspect(x)}>
                  Inspect
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                <span>{actor?.full_name ?? "System"} ({actor?.role ?? "SYSTEM"})</span>
                <span className="tabular-nums">{dateTime(x.created_at)}</span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="hidden w-full overflow-x-auto md:block">
        <Table className="w-full text-left text-sm tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp (IST)</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Inspect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((x) => {
              const actor = users.find((u) => u.id === x.actor_user_id);
              return (
                <TableRow key={x.id}>
                  <TableCell>{dateTime(x.created_at)}</TableCell>
                  <TableCell>
                    {actor?.full_name ?? "System"}
                    <small>{actor?.role ?? "SYSTEM"}</small>
                  </TableCell>
                  <TableCell>{x.action}</TableCell>
                  <TableCell>
                    {x.entity_type.toUpperCase()} #{x.entity_id ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setInspect(x)}
                    >
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No audit entries match these filters.
          </p>
        )}
      </div>
      <Dialog
        open={!!inspect}
        onOpenChange={(v) => {
          if (!v) setInspect(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit entry</DialogTitle>
            <DialogDescription>
              Values are redacted before display.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-3 sm:grid-cols-2 [&_pre]:max-h-72 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs">
            <div>
              <strong>Previous values</strong>
              <pre>
                {JSON.stringify(
                  redactAuditValue(inspect?.old_data ?? null),
                  null,
                  2,
                )}
              </pre>
            </div>
            <div>
              <strong>New values</strong>
              <pre>
                {JSON.stringify(
                  redactAuditValue(inspect?.new_data ?? null),
                  null,
                  2,
                )}
              </pre>
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="min-h-11 sm:min-h-10">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
