/* eslint-disable @next/next/no-img-element -- Category images can be local or user-provided. */
import type { Category, MenuItem } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolveAssetUrl } from "@/lib/format";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
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
      className="mouse-drag-scroll filter-scroll flex snap-x flex-nowrap gap-2 overflow-x-auto py-2"
      role="group"
      aria-label="Menu categories"
    >
      <Button
        variant={selected === null ? "default" : "outline"}
        size="lg"
        className="min-h-11 snap-start px-3"
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
      >
        <strong>All Items</strong>
        <Badge variant="secondary">{items.length}</Badge>
      </Button>
      {categories.map((c) => (
        <Button
          key={c.id}
          variant={selected === c.id ? "default" : "outline"}
          size="lg"
          className="min-h-11 snap-start px-3"
          aria-pressed={selected === c.id}
          onClick={() => onSelect(c.id)}
        >
          <img
            draggable={false}
            className="size-7 shrink-0 rounded-lg object-cover"
            src={resolveAssetUrl(c.image_path, "/images/category.svg")}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/images/category.svg";
            }}
          />
          <strong>{c.name}</strong>
          <Badge variant="secondary">
            {items.filter((i) => i.category_id === c.id).length}
          </Badge>
        </Button>
      ))}
    </div>
  );
}
