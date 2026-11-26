import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function FilterToolbar({
  search,
  onSearchChange,
  placeholder = "Search",
  children,
  actions,
  shortcut,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
  actions?: ReactNode;
  shortcut?: boolean;
}) {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 w-full sm:min-w-48 sm:flex-1">
        <Input
          aria-label={placeholder}
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          leadingIcon={<Search className="size-4" />}
          clearable
          clearLabel="Clear search"
          onClear={() => onSearchChange("")}
          trailingIcon={
            !search && shortcut ? (
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                /
              </kbd>
            ) : undefined
          }
        />
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
