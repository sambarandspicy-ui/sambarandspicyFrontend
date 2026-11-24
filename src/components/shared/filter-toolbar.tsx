import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
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
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-48 flex-1">
        <Search
          aria-hidden="true"
          className="absolute top-3 left-3 size-4 text-muted-foreground"
        />
        <Input
          aria-label={placeholder}
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pr-12 pl-9"
        />
        {search ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
            className="absolute top-0 right-0 grid size-10 place-items-center"
          >
            <X className="size-4" />
          </button>
        ) : (
          shortcut && (
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-3 text-xs text-muted-foreground"
            >
              /
            </span>
          )
        )}
      </div>
      {children}
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
