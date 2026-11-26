/* eslint-disable @next/next/no-img-element -- User images and offline fallback. */
import { Plus } from "lucide-react";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MenuItem, PortionSize } from "@/types/domain";
import { formatINR, resolveAssetUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DishCard({
  item,
  quantities,
  canEdit,
  onAdd,
  category,
  compact,
}: {
  item: MenuItem;
  quantities: Record<PortionSize, number>;
  canEdit: boolean;
  onAdd: (portion: PortionSize) => void;
  category: string;
  compact: boolean;
}) {
  const quantity = quantities.FULL + quantities.HALF;

  const content = (
    <>
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          compact ? "h-20 w-20 shrink-0 rounded-xl" : "aspect-[4/3] w-full",
        )}
      >
        <img
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none"
          src={resolveAssetUrl(item.image_path, "/images/dish.svg")}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/images/dish.svg";
          }}
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#092b16]/25 to-transparent" />
        <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-lg bg-white/95 shadow-xs">
          <DietaryBadge type={item.dietary_type} />
        </span>
      </div>

      <span
        className={cn(
          "block min-w-0 flex-1 text-left",
          compact ? "px-3 py-1.5" : "px-3 pt-2.5 sm:px-3.5 sm:pt-3",
        )}
      >
        <small className="block truncate text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
          {category}
        </small>
        <strong className="mt-0.5 line-clamp-2 text-sm leading-5 font-bold text-foreground">
          {item.name}
        </strong>
        {item.description && (
          <small
            className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground"
            title={item.description}
          >
            {item.description}
          </small>
        )}
      </span>
    </>
  );

  return (
    <Card
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden transition-all hover:border-[#b99a46]/50 hover:shadow-md",
        quantity > 0 && "border-primary/40 ring-1 ring-primary/20",
        compact && "flex-row flex-wrap items-center gap-1 p-2",
      )}
    >
      {quantity > 0 && (
        <Badge
          className="absolute top-2 right-2 z-10 border border-[#ebc96f]/60 bg-primary text-white shadow-sm ring-2 ring-card"
          aria-hidden="true"
        >
          {quantity}
        </Badge>
      )}

      {canEdit ? (
        <Button
          variant="ghost"
          className={cn(
            "h-auto min-h-0 w-full flex-1 flex-col items-stretch justify-start overflow-hidden rounded-none whitespace-normal p-0 hover:bg-transparent active:scale-100",
            compact && "min-w-0 flex-1 rounded-xl",
          )}
          aria-label={`Add ${item.name} to cart`}
          onClick={() => onAdd("FULL")}
        >
          <span
            className={cn(
              "flex w-full flex-1 flex-col",
              compact && "flex-row items-center",
            )}
          >
            {content}
          </span>
        </Button>
      ) : (
        <div
          className={cn(
            "flex w-full flex-1 flex-col",
            compact && "min-w-0 flex-1 flex-row items-center",
          )}
        >
          {content}
        </div>
      )}

      <div
        className={cn(
          "mt-auto flex min-w-0 items-center justify-between gap-1.5 px-3 pt-2 pb-2.5 sm:px-3.5 sm:pb-3",
          compact && "mt-0 ml-auto shrink-0 p-1.5",
        )}
      >
        <div className="min-w-0">
          <strong className="block truncate text-sm font-extrabold tabular-nums text-primary sm:text-base dark:text-[#ebc96f]">
            {formatINR(item.selling_price, { compact: true })}
          </strong>
          {item.has_half_portion && item.half_selling_price != null && (
            <small className="block truncate text-[11px] font-medium tabular-nums text-muted-foreground">
              Half: {formatINR(item.half_selling_price, { compact: true })}
            </small>
          )}
        </div>

        {canEdit && (
          <Button
            variant={quantities.FULL ? "default" : "outline"}
            size="sm"
            className={cn(
              "min-h-9 shrink-0 gap-1 px-2.5 sm:px-3",
              quantities.FULL > 0 && "border border-[#b58a27]/40",
            )}
            onClick={() => onAdd("FULL")}
            aria-label={`Add full ${item.name}`}
            aria-describedby={`dish-${item.id}-full-count`}
          >
            <Plus size={15} aria-hidden="true" />
            <span>{item.has_half_portion ? "Full" : "Add"}</span>
            {quantities.FULL > 0 && (
              <span
                aria-hidden="true"
                className="rounded-md bg-white/20 px-1.5 text-[11px] font-bold tabular-nums"
              >
                {quantities.FULL}
              </span>
            )}
          </Button>
        )}
      </div>

      {canEdit && item.has_half_portion && item.half_selling_price != null && (
        <div
          className={cn(
            "px-3 pb-2.5 sm:px-3.5 sm:pb-3",
            compact && "basis-full px-1 pb-1 pt-0 sm:basis-auto",
          )}
        >
          <Button
            variant={quantities.HALF ? "default" : "secondary"}
            size="sm"
            className="min-h-9 w-full justify-between px-2.5 text-xs"
            onClick={() => onAdd("HALF")}
            aria-label={`Add half ${item.name} for ${formatINR(item.half_selling_price)}`}
            aria-describedby={`dish-${item.id}-half-count`}
          >
            <span className="inline-flex items-center gap-1">
              <Plus size={14} aria-hidden="true" />
              <span>Half {formatINR(item.half_selling_price)}</span>
            </span>
            {quantities.HALF > 0 && (
              <span
                aria-hidden="true"
                className="rounded-md bg-white/20 px-1.5 text-[11px] font-bold tabular-nums"
              >
                {quantities.HALF}
              </span>
            )}
          </Button>
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        <span id={`dish-${item.id}-full-count`}>
          Full portions in bill: {quantities.FULL}.
        </span>{" "}
        <span id={`dish-${item.id}-half-count`}>
          Half portions in bill: {quantities.HALF}.
        </span>
      </span>
    </Card>
  );
}
