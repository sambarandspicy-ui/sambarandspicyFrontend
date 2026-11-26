/* eslint-disable @next/next/no-img-element -- Category images can be local or user-provided. */
import type { Category, MenuItem } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveAssetUrl } from "@/lib/format";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import { cn } from "@/lib/utils";

export function CategoryStrip({
  categories,
  items,
  selected,
  onSelect,
}: {
  categories: Category[];
  items: MenuItem[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  const dragScroll = useMouseDragScroll();

  return (
    <div
      {...dragScroll}
      className="mouse-drag-scroll pos-scroll no-scrollbar flex snap-x flex-nowrap gap-2 overflow-x-auto py-2.5"
      role="group"
      aria-label="Menu categories"
    >
      <Button
        variant={selected === null ? "default" : "outline"}
        size="default"
        className={cn(
          "snap-start rounded-full px-3.5 whitespace-nowrap",
          selected === null
            ? "border border-[#b58a27]/50 ring-1 ring-[#b58a27]/30"
            : "bg-card hover:bg-muted",
        )}
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
      >
        <span className="font-bold">All Items</span>
        <Badge
          variant={selected === null ? "secondary" : "outline"}
          className={cn(
            "px-2 py-0.5 text-[11px] tabular-nums",
            selected === null &&
              "border-transparent bg-white/20 text-white dark:bg-white/20",
          )}
        >
          {items.length}
        </Badge>
      </Button>

      {categories.map((c) => {
        const active = selected === c.id;
        return (
          <Button
            key={c.id}
            variant={active ? "default" : "outline"}
            size="default"
            className={cn(
              "snap-start rounded-full px-3 whitespace-nowrap",
              active
                ? "border border-[#b58a27]/50 ring-1 ring-[#b58a27]/30"
                : "bg-card hover:bg-muted",
            )}
            aria-pressed={active}
            onClick={() => onSelect(c.id)}
          >
            <img
              draggable={false}
              className="size-6 shrink-0 rounded-full border border-border/50 object-cover"
              src={resolveAssetUrl(c.image_path, "/images/category.svg")}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/images/category.svg";
              }}
            />
            <span className="font-bold">{c.name}</span>
            <Badge
              variant={active ? "secondary" : "outline"}
              className={cn(
                "px-2 py-0.5 text-[11px] tabular-nums",
                active &&
                  "border-transparent bg-white/20 text-white dark:bg-white/20",
              )}
            >
              {items.filter((i) => i.category_id === c.id).length}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}
