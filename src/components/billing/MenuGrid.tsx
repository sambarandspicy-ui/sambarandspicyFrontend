import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ChoiceMenu } from "@/components/ui/choice-menu";
import { QueryError } from "@/components/shared/QueryState";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, MenuItem, PortionSize } from "@/types/domain";
import { DishCard } from "./DishCard";
export type SortMode = "default" | "low" | "high" | "name";
export function MenuGrid({
  items,
  categories,
  title,
  sort,
  onSort,
  loading,
  error,
  quantities,
  canEdit,
  onAdd,
  onRetry,
  onReset,
}: {
  categories: Category[];
  onRetry: () => void;
  onReset: () => void;
  items: MenuItem[];
  title: string;
  sort: SortMode;
  onSort: (value: SortMode) => void;
  loading: boolean;
  error: boolean;
  quantities: Record<number, Record<PortionSize, number>>;
  canEdit: boolean;
  onAdd: (item: MenuItem, portion: PortionSize) => void;
}) {
  const [compact, setCompact] = useState(false);
  return (
    <section className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading
              ? "Loading menu..."
              : `${items.length} ${items.length === 1 ? "item" : "items"} available`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex rounded-xl border border-border bg-muted p-1"
            role="group"
            aria-label="Menu view"
          >
            <Button
              variant={!compact ? "secondary" : "ghost"}
              size="icon"
              aria-label="Photos grid"
              aria-pressed={!compact}
              className={!compact ? "bg-card shadow-sm" : undefined}
              onClick={() => setCompact(false)}
            >
              <LayoutGrid size={17} />
            </Button>
            <Button
              variant={compact ? "secondary" : "ghost"}
              size="icon"
              aria-label="Compact list"
              aria-pressed={compact}
              className={compact ? "bg-card shadow-sm" : undefined}
              onClick={() => setCompact(true)}
            >
              <List size={17} />
            </Button>
          </div>
          <ChoiceMenu
            label="Sort by"
            value={sort}
            onValueChange={onSort}
            options={[
              { value: "default", label: "Default" },
              { value: "low", label: "Price: Low to High" },
              { value: "high", label: "Price: High to Low" },
              { value: "name", label: "Name A-Z" },
            ]}
          />
        </div>
      </div>
      {error ? (
        <QueryError onRetry={onRetry} />
      ) : loading ? (
        <div
          className="grid grid-cols-2 gap-3"
          aria-label="Loading menu"
          role="status"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton className="h-40" key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center">
          <EmptyState
            title="No dishes found"
            description="Try a different search or category."
          />
          <Button variant="outline" onClick={onReset}>
            Reset filters
          </Button>
        </div>
      ) : (
        <div
          className={
            compact
              ? "grid grid-cols-1 gap-2.5 md:grid-cols-2"
              : "grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4"
          }
        >
          {items.map((item) => (
            <DishCard
              key={item.id}
              category={
                categories.find((c) => c.id === item.category_id)?.name ??
                "Menu"
              }
              compact={compact}
              item={item}
              quantities={quantities[item.id] ?? { FULL: 0, HALF: 0 }}
              canEdit={canEdit}
              onAdd={(portion) => onAdd(item, portion)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
