"use client";
import { useState, useSyncExternalStore } from "react";
import {
  History,
  Layers,
  QrCode,
  Store,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Alert } from "@/components/ui/alert";
import { QueryError, QuerySkeleton } from "@/components/shared/QueryState";
import { useAuth } from "@/providers/auth-provider";
import { useAdmin, useCatalog, useStoreSettings } from "@/hooks/queries";
import type { Category, MenuItem, User } from "@/types/domain";
import { StoreProfileTab } from "./StoreProfileTab";
import { CategoriesTab } from "./CategoriesTab";
import { MenuItemsTab } from "./MenuItemsTab";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { MenuItemFormDialog } from "./MenuItemFormDialog";
import { MenuImageDialog } from "./MenuImageDialog";
import { validateUploadImageFile } from "./ImagePicker";
import { UserAccessTab } from "./UserAccessTab";
import { EditUserDialog } from "./EditUserDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { AuditHistoryTab } from "./AuditHistoryTab";
import { CustomerMenuTab } from "./CustomerMenuTab";
type Tab = "profile" | "categories" | "menu" | "customer-menu" | "users" | "audit";
type Confirm =
  | { kind: "category"; value: Category }
  | { kind: "menu"; value: MenuItem }
  | { kind: "user"; value: User }
  | { kind: "delete-menu"; value: MenuItem }
  | { kind: "delete-category"; value: Category };
const tabs: {
  id: Tab;
  label: string;
  icon: typeof Store;
  adminOnly?: boolean;
}[] = [
  { id: "profile", label: "Store profile", icon: Store },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "menu", label: "Menu items", icon: UtensilsCrossed },
  { id: "customer-menu", label: "Customer menu", icon: QrCode, adminOnly: true },
  { id: "users", label: "User access", icon: Users, adminOnly: true },
  { id: "audit", label: "Audit history", icon: History, adminOnly: true },
];
const tabListeners = new Set<() => void>();
function subscribeTab(listener: () => void) {
  tabListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    tabListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}
function readTabFromLocation(): Tab {
  if (typeof window === "undefined") return "profile";
  const param = new URLSearchParams(window.location.search).get("tab");
  return tabs.some((t) => t.id === param) ? (param as Tab) : "profile";
}
function writeTabToLocation(next: Tab) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (next === "profile") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  } catch {
    // Ignore history errors in restricted browser contexts.
  }
  tabListeners.forEach((listener) => listener());
}
export function AdminWorkspace() {
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const requestedTab = useSyncExternalStore(
    subscribeTab,
    readTabFromLocation,
    () => "profile" as Tab,
  );
  const requestedMeta = tabs.find((t) => t.id === requestedTab);
  const tab: Tab =
    requestedMeta && (admin || !requestedMeta.adminOnly)
      ? requestedTab
      : "profile";
  const settings = useStoreSettings();
  const catalog = useCatalog();
  const controls = useAdmin(admin, admin && tab === "audit");
  const [categoryDialog, setCategoryDialog] = useState<{
    item: Category | null;
  } | null>(null);
  const [menuDialog, setMenuDialog] = useState<{
    item: MenuItem | null;
  } | null>(null);
  const [imageItem, setImageItem] = useState<MenuItem | null>(null);
  const [imageCategory, setImageCategory] = useState<Category | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "destructive";
  } | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function runMutation(
    task: () => Promise<void>,
    successMessage: string,
    fallbackError: string,
  ) {
    try {
      await task();
      setToast({ message: successMessage, variant: "success" });
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim() ? e.message : fallbackError;
      setToast({ message: msg, variant: "destructive" });
      throw e;
    }
  }
  const categories = catalog.categories.data ?? [],
    items = catalog.menuItems.data ?? [],
    users = controls.users.data ?? [];
  const catalogTab =
    tab === "categories" || tab === "menu" || tab === "profile";
  const loading =
    (tab === "profile" && settings.isLoading) ||
    (catalogTab &&
      (catalog.categories.isLoading || catalog.menuItems.isLoading)) ||
    ((tab === "users" || tab === "audit") && controls.users.isLoading) ||
    (tab === "audit" && controls.audits.isLoading);
  const failed =
    (tab === "profile" && settings.isError) ||
    (catalogTab && (catalog.categories.isError || catalog.menuItems.isError)) ||
    ((tab === "users" || tab === "audit") && controls.users.isError) ||
    (tab === "audit" && controls.audits.isError);
  async function confirmAction() {
    if (!confirm || !admin) return;
    setError("");
    try {
      if (confirm.kind === "delete-menu") {
        await catalog.deleteMenuItem.mutateAsync(confirm.value.id);
        setToast({
          message: `"${confirm.value.name}" deleted.`,
          variant: "success",
        });
        setConfirm(null);
        return;
      }
      if (confirm.kind === "delete-category") {
        await catalog.deleteCategory.mutateAsync(confirm.value.id);
        setToast({
          message: `Category "${confirm.value.name}" deleted.`,
          variant: "success",
        });
        setConfirm(null);
        return;
      }
      if (confirm.kind === "category")
        await catalog.updateCategory.mutateAsync({
          id: confirm.value.id,
          input: { is_active: !confirm.value.is_active },
        });
      else if (confirm.kind === "menu")
        await catalog.updateMenuItem.mutateAsync({
          id: confirm.value.id,
          input: { is_available: !confirm.value.is_available },
        });
      else
        await controls.updateUser.mutateAsync({
          id: confirm.value.id,
          input: { is_active: !confirm.value.is_active },
        });
      setToast({ message: "Changes saved.", variant: "success" });
      setConfirm(null);
    } catch (e) {
      const raw =
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not save changes.";
      const isDelete =
        confirm.kind === "delete-menu" || confirm.kind === "delete-category";
      const hint =
        confirm.kind === "delete-menu" &&
        /bill|order|reference|conflict|used/i.test(raw)
          ? `${raw} Mark it Unavailable instead if it appears on past orders.`
          : raw;
      if (isDelete) {
        setConfirm(null);
        setToast({ message: hint, variant: "destructive" });
      } else {
        setError(hint);
        setToast({ message: hint, variant: "destructive" });
      }
    }
  }
  const tabCount: Partial<Record<Tab, number>> = {
    categories: categories.length || undefined,
    menu: items.length || undefined,
    users: users.length || undefined,
  };
  if (!user) return null;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Store administration"
        description="Manage your store identity, menu catalog, QR menu and team access."
        badge={
          <StatusBadge tone={admin ? "success" : "neutral"}>
            {admin ? "Admin access" : "Read-only view"}
          </StatusBadge>
        }
      />
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
      <nav
        className="pos-scroll no-scrollbar flex max-w-full flex-nowrap gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-2xs"
        role="group"
        aria-label="Administration sections"
      >
        {tabs
          .filter((t) => admin || !t.adminOnly)
          .map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const count = tabCount[t.id];
            return (
              <Button
                key={t.id}
                variant={active ? "default" : "ghost"}
                size="default"
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                aria-pressed={active}
                onClick={() => writeTabToLocation(t.id)}
                className={
                  active
                    ? "min-h-10 shrink-0 gap-2 whitespace-nowrap rounded-xl px-3.5 shadow-xs"
                    : "min-h-10 shrink-0 gap-2 whitespace-nowrap rounded-xl px-3.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              >
                <Icon size={16} aria-hidden="true" />
                <span>{t.label}</span>
                {count !== undefined && (
                  <span
                    aria-hidden="true"
                    className={
                      active
                        ? "rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums text-white"
                        : "rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums text-muted-foreground"
                    }
                  >
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
      </nav>
      {loading ? (
        <QuerySkeleton />
      ) : failed || (tab === "profile" && !settings.data) ? (
        <QueryError
          onRetry={() => {
            void Promise.all([
              settings.refetch(),
              catalog.categories.refetch(),
              catalog.menuItems.refetch(),
              ...(admin
                ? [controls.users.refetch(), controls.audits.refetch()]
                : []),
            ]);
          }}
        />
      ) : tab === "profile" && settings.data ? (
        <StoreProfileTab
          key={settings.data.updated_at}
          settings={settings.data}
          categories={categories}
          items={items}
          users={users}
          admin={admin}
          pending={controls.updateStore.isPending}
          onSave={(v) =>
            runMutation(
              () => controls.updateStore.mutateAsync(v).then(() => undefined),
              "Store details saved.",
              "Could not save store details.",
            )
          }
          onManage={() => writeTabToLocation("users")}
          onCategory={() => setCategoryDialog({ item: null })}
          onMenu={() => setMenuDialog({ item: null })}
        />
      ) : tab === "categories" ? (
        <CategoriesTab
          categories={categories}
          items={items}
          admin={admin}
          onAdd={() => setCategoryDialog({ item: null })}
          onEdit={(item) => setCategoryDialog({ item })}
          onImage={setImageCategory}
          onDelete={(value) => {
            setError("");
            setConfirm({ kind: "delete-category", value });
          }}
          onToggle={(value) => {
            setError("");
            setConfirm({ kind: "category", value });
          }}
        />
      ) : tab === "menu" ? (
        <MenuItemsTab
          categories={categories}
          items={items}
          admin={admin}
          onAdd={() => setMenuDialog({ item: null })}
          onEdit={(item) => setMenuDialog({ item })}
          onImage={setImageItem}
          onDelete={(value) => {
            setError("");
            setConfirm({ kind: "delete-menu", value });
          }}
          onToggle={(value) => {
            setError("");
            setConfirm({ kind: "menu", value });
          }}
        />
      ) : tab === "customer-menu" && admin ? (
        <CustomerMenuTab settings={settings.data} />
      ) : tab === "users" && admin ? (
        <UserAccessTab
          users={users}
          onEdit={setEditUser}
          onReset={setResetUser}
          onToggle={(value) => {
            setError("");
            setConfirm({ kind: "user", value });
          }}
        />
      ) : tab === "audit" && admin ? (
        <AuditHistoryTab logs={controls.audits.data ?? []} users={users} />
      ) : null}
      {admin && categoryDialog && (
        <CategoryFormDialog
          category={categoryDialog.item}
          categories={categories}
          onClose={() => setCategoryDialog(null)}
          pending={
            uploading ||
            catalog.createCategory.isPending ||
            catalog.updateCategory.isPending
          }
          onSave={(value, file) =>
            runMutation(
              async () => {
                let savedCat: Category;
                if (categoryDialog.item)
                  savedCat = await catalog.updateCategory.mutateAsync({
                    id: categoryDialog.item.id,
                    input: value,
                  });
                else savedCat = await catalog.createCategory.mutateAsync(value);
                if (file && savedCat?.id) {
                  const fileIssue = validateUploadImageFile(file);
                  if (fileIssue) throw new Error(fileIssue);
                  setUploading(true);
                  try {
                    await catalog.uploadCategoryImage.mutateAsync({ id: savedCat.id, file });
                  } catch {
                    setCategoryDialog({ item: savedCat });
                    throw new Error(
                      "Category saved, but the image upload failed. Retry to upload the image.",
                    );
                  } finally {
                    setUploading(false);
                  }
                }
              },
              "Category saved.",
              "Could not save category.",
            )
          }
        />
      )}
      {admin && menuDialog && (
        <MenuItemFormDialog
          item={menuDialog.item}
          categories={categories}
          items={items}
          onClose={() => setMenuDialog(null)}
          pending={
            uploading ||
            catalog.createMenuItem.isPending ||
            catalog.updateMenuItem.isPending
          }
          onSave={(value, file) =>
            runMutation(
              async () => {
                let savedItem: MenuItem;
                if (menuDialog.item)
                  savedItem = await catalog.updateMenuItem.mutateAsync({
                    id: menuDialog.item.id,
                    input: value,
                  });
                else savedItem = await catalog.createMenuItem.mutateAsync(value);
                if (file && savedItem?.id) {
                  const fileIssue = validateUploadImageFile(file);
                  if (fileIssue) throw new Error(fileIssue);
                  setUploading(true);
                  try {
                    await catalog.uploadMenuItemImage.mutateAsync({ id: savedItem.id, file });
                  } catch {
                    setMenuDialog({ item: savedItem });
                    throw new Error(
                      "Dish saved, but the image upload failed. Retry to upload the image.",
                    );
                  } finally {
                    setUploading(false);
                  }
                }
              },
              "Menu item saved.",
              "Could not save dish.",
            )
          }
        />
      )}
      {admin && imageItem && (
        <MenuImageDialog item={imageItem} onClose={() => setImageItem(null)} onSave={(file, removed) =>
          runMutation(
            async () => {
              if (file) {
                await catalog.uploadMenuItemImage.mutateAsync({ id: imageItem.id, file });
              } else if (removed) {
                await catalog.updateMenuItem.mutateAsync({ id: imageItem.id, input: { image_path: null } });
              }
            },
            "Dish photo saved.",
            "Could not save dish photo.",
          )
        } />
      )}
      {admin && imageCategory && (
        <MenuImageDialog kind="category" item={imageCategory} onClose={() => setImageCategory(null)} onSave={(file, removed) =>
          runMutation(
            async () => {
              if (file) {
                await catalog.uploadCategoryImage.mutateAsync({ id: imageCategory.id, file });
              } else if (removed) {
                await catalog.updateCategory.mutateAsync({ id: imageCategory.id, input: { image_path: null } });
              }
            },
            "Category photo saved.",
            "Could not save category photo.",
          )
        } />
      )}
      {admin && editUser && (
        <EditUserDialog
          user={editUser}
          users={users}
          onClose={() => setEditUser(null)}
          pending={controls.updateUser.isPending}
          onSave={(input) =>
            runMutation(
              () =>
                controls.updateUser
                  .mutateAsync({ id: editUser.id, input })
                  .then(() => undefined),
              "User details saved.",
              "Could not save user details.",
            )
          }
        />
      )}
      {admin && resetUser && (
        <ResetPasswordDialog
          user={resetUser}
          onClose={() => setResetUser(null)}
          pending={controls.resetPassword.isPending}
          onSave={(password) =>
            runMutation(
              () =>
                controls.resetPassword
                  .mutateAsync({
                    id: resetUser.id,
                    password,
                  })
                  .then(() => undefined),
              "Demo password reset.",
              "Could not reset password.",
            )
          }
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (
            !v &&
            !catalog.deleteMenuItem.isPending &&
            !catalog.deleteCategory.isPending
          ) {
            setConfirm(null);
          }
        }}
        title={
          confirm?.kind === "delete-menu"
            ? "Delete menu item?"
            : confirm?.kind === "delete-category"
              ? "Delete category?"
              : "Confirm change"
        }
        description={
          confirm?.kind === "delete-menu"
            ? `Permanently delete "${confirm.value.name}"? Its menu image will also be cleaned up. This action cannot be undone.`
            : confirm?.kind === "delete-category"
              ? `Permanently delete category "${confirm.value.name}"? Categories with dishes cannot be deleted.`
              : confirm?.kind === "category"
                ? `${confirm.value.is_active ? "Archive" : "Activate"} category ${confirm.value.name}?`
                : confirm?.kind === "menu"
                  ? `${confirm.value.is_available ? "Make unavailable" : "Make available"}: ${confirm.value.name}?`
                  : confirm?.kind === "user"
                    ? `${confirm.value.is_active ? "Deactivate" : "Activate"} ${confirm.value.full_name}?`
                    : ""
        }
        confirmLabel={
          confirm?.kind === "delete-menu"
            ? "Delete dish"
            : confirm?.kind === "delete-category"
              ? "Delete category"
              : "Confirm"
        }
        destructive={
          confirm?.kind === "delete-menu" || confirm?.kind === "delete-category"
        }
        pending={
          catalog.updateCategory.isPending ||
          catalog.updateMenuItem.isPending ||
          catalog.deleteMenuItem.isPending ||
          catalog.deleteCategory.isPending ||
          controls.updateUser.isPending
        }
        onConfirm={() => void confirmAction()}
      >
        {error && (
          <Alert variant="destructive" role="alert">
            {error}
          </Alert>
        )}
      </ConfirmDialog>
    </div>
  );
}
