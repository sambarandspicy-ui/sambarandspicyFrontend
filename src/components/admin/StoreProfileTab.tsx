"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/shared/form-field";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import type { Category, MenuItem, StoreSettings, User } from "@/types/domain";
import { StatusBadge } from "@/components/shared/status-badge";
const schema = z.object({
  store_name: z.string().trim().min(1, "Enter a store name").max(120),
  address: z.string().max(500),
  phone: z.string().max(25),
  receipt_footer: z.string().max(255),
});
type Values = z.infer<typeof schema>;
export function StoreProfileTab({
  settings,
  categories,
  items,
  users,
  admin,
  onSave,
  onManage,
  onCategory,
  onMenu,
  pending,
}: {
  settings: StoreSettings;
  categories: Category[];
  items: MenuItem[];
  users: User[];
  admin: boolean;
  onSave: (v: Values) => Promise<void>;
  onManage: () => void;
  onCategory: () => void;
  onMenu: () => void;
  pending: boolean;
}) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      store_name: settings.store_name,
      address: settings.address,
      phone: settings.phone,
      receipt_footer: settings.receipt_footer ?? "",
    },
  });
  async function save(v: Values) {
    try {
      setError("");
      await onSave(v);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save store details.",
      );
    }
  }
  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[7fr_5fr]">
        <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
          <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
            <div>
              <h2>Store identity</h2>
              <p>Details used throughout the workspace and on receipts.</p>
            </div>
          </div>
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => void handleSubmit(save)(e)}
          >
            <fieldset disabled={!admin || pending} className="space-y-4">
              <FormField label="Store name" htmlFor="store-name" error={errors.store_name?.message} required>
                <Input id="store-name" maxLength={120} error={!!errors.store_name} {...register("store_name")} />
              </FormField>
              <FormField label="Store address" htmlFor="store-address">
                <Textarea id="store-address" maxLength={500} {...register("address")} />
              </FormField>
              <FormField label="Phone number" htmlFor="store-phone">
                <Input id="store-phone" maxLength={25} inputMode="tel" {...register("phone")} />
              </FormField>
              <FormField label="Receipt footer" htmlFor="store-footer">
                <Input id="store-footer" maxLength={255} {...register("receipt_footer")} />
              </FormField>
            </fieldset>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground [&_span]:rounded-lg [&_span]:bg-muted [&_span]:px-3 [&_span]:py-2">
              <span>Currency: {settings.currency_code}</span>
              <span>Business timezone: {settings.business_timezone}</span>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {admin && (
              <Button
                variant="default"
                type="submit"
                className="min-h-11 sm:min-h-10"
                loading={pending}
              >
                {pending ? "Saving..." : "Save store details"}
              </Button>
            )}
          </form>
        </Card>
        <div className="grid gap-5">
          <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
            <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
              <div>
                <h2>Fixed system accounts (3 of 3)</h2>
                <p>
                  Exactly one account for each role; no open signup or fourth
                  user slot.
                </p>
              </div>
            </div>
            <div className="space-y-3 p-5 text-sm [&>div]:flex [&>div]:justify-between [&_p]:text-muted-foreground">
              {(
                [
                  [1, "Admin"],
                  [2, "Billing user"],
                  [3, "Read-only user"],
                ] as const
              ).map(([id, label]) => (
                <div key={id}>
                  <strong>{label}</strong>
                  {admin && (
                    <StatusBadge
                      tone={
                        users.find((u) => u.id === id)?.is_active
                          ? "success"
                          : "neutral"
                      }
                    >
                      {users.find((u) => u.id === id)?.is_active
                        ? "Active"
                        : "Inactive"}
                    </StatusBadge>
                  )}
                </div>
              ))}
              {admin && (
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={onManage}
                >
                  Manage access
                </Button>
              )}
            </div>
          </Card>
          <Card className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
            <div className="flex items-start justify-between gap-3 border-b border-border p-5 [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground">
              <div>
                <h2>Menu management</h2>
                <p>Catalog available for counter billing.</p>
              </div>
            </div>
            <div className="space-y-3 p-5 text-sm [&>div]:flex [&>div]:justify-between [&_p]:text-muted-foreground">
              <div>
                <span>Active categories</span>
                <strong>{categories.filter((x) => x.is_active).length}</strong>
              </div>
              <div>
                <span>Available dishes</span>
                <strong>{items.filter((x) => x.is_available).length}</strong>
              </div>
              <p>
                Maximum one image per category and dish. Archive instead of
                deleting referenced items to preserve historical bills.
              </p>
            </div>
          </Card>
        </div>
      </div>
      {admin && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 [&_p]:mt-1 [&_p]:text-sm [&_p]:text-muted-foreground [&>div:last-child]:flex [&>div:last-child]:flex-wrap [&>div:last-child]:gap-2">
          <div>
            <strong>Quick catalog controls</strong>
            <p>Add a category or dish to your menu.</p>
          </div>
          <div>
            <Button variant="outline" className="min-h-11" onClick={onCategory}>
              <Plus size={16} /> Add category
            </Button>
            <Button variant="default" className="min-h-11" onClick={onMenu}>
              <Plus size={16} /> Add menu item
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
