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
          compact ? "h-20 w-20 shrink-0 rounded-xl" : "aspect-[16/10] w-full",
        )}
      >
        <img
          className="h-full w-full object-cover transition-transform group-hover:scale-105 motion-reduce:transform-none"
          src={resolveAssetUrl(item.image_path, "/images/dish.svg")}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/images/dish.svg";
          }}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-md bg-white">
          <DietaryBadge type={item.dietary_type} />
        </span>
      </div>
      <span
        className={cn(
          "block min-w-0 text-left",
          compact ? "px-3 py-2" : "px-3 pt-3",
        )}
      >
        <strong className="line-clamp-2 text-sm text-foreground">
          {item.name}
        </strong>
        <small className="mt-1 block text-xs text-muted-foreground">
          {category}
        </small>
        {item.description && (
          <small
            className="mt-1 line-clamp-2 text-xs text-muted-foreground"
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
        "group relative overflow-hidden transition-shadow hover:shadow-md",
        compact && "flex flex-wrap items-center p-2",
      )}
    >
      {quantity > 0 && (
        <Badge
          className="absolute top-2 right-2 z-10 ring-2 ring-background"
          aria-hidden="true"
        >
          {quantity}
        </Badge>
      )}
      {canEdit ? (
        <Button
          variant="ghost"
          className={cn(
            "h-auto w-full justify-start overflow-hidden whitespace-normal p-0",
            compact && "min-w-0 basis-full sm:w-auto sm:basis-0 sm:flex-1",
          )}
          aria-label={`Add ${item.name} to cart`}
          onClick={() => onAdd("FULL")}
        >
          <span className={cn("block w-full", compact && "flex items-center")}>
            {content}
          </span>
        </Button>
      ) : (
        <div className={cn("w-full", compact && "flex min-w-0 basis-full items-center sm:basis-0 sm:flex-1")}>
          {content}
        </div>
      )}
      <div
        className={cn(
          "flex min-w-0 items-center justify-between gap-1 p-2.5 sm:gap-2 sm:p-3",
          compact && "ml-auto p-2",
        )}
      >
        <span>
          <strong className="text-sm tabular-nums">
            {formatINR(item.selling_price, { compact: true })}
          </strong>
          {item.has_half_portion && item.half_selling_price != null && (
            <small className="block text-xs text-muted-foreground">
              Half: {formatINR(item.half_selling_price)}
            </small>
          )}
        </span>
        {canEdit && (
          <Button
            variant={quantities.FULL ? "default" : "outline"}
            size="lg"
            className="min-h-11 shrink-0 px-2 sm:px-3"
            onClick={() => onAdd("FULL")}
            aria-label={`Add full ${item.name}`}
            aria-describedby={`dish-${item.id}-full-count`}
          >
            <Plus size={16} />
            <span className="max-[399px]:hidden">
              {item.has_half_portion
                ? "Full"
                : "Add"}
            </span>
            <span className="min-[400px]:hidden">
              {item.has_half_portion
                ? "Full"
                : "Add"}
            </span>
            {quantities.FULL > 0 && (
              <span aria-hidden="true" className="rounded-md bg-white/20 px-1.5 tabular-nums">{quantities.FULL}</span>
            )}
          </Button>
        )}
      </div>
      {canEdit && item.has_half_portion && item.half_selling_price != null && (
        <Button
          variant={quantities.HALF ? "default" : "outline"}
          className="m-2 min-h-11 px-2 sm:px-3"
          onClick={() => onAdd("HALF")}
          aria-label={`Add half ${item.name} for ${formatINR(item.half_selling_price)}`}
          aria-describedby={`dish-${item.id}-half-count`}
        >
          <Plus size={16} /> Half {formatINR(item.half_selling_price)}
          {quantities.HALF > 0 && (
            <span aria-hidden="true" className="rounded-md bg-white/20 px-1.5 tabular-nums">{quantities.HALF}</span>
          )}
        </Button>
      )}
      <span className="sr-only" aria-live="polite">
        <span id={`dish-${item.id}-full-count`}>Full portions in bill: {quantities.FULL}.</span>{" "}
        <span id={`dish-${item.id}-half-count`}>Half portions in bill: {quantities.HALF}.</span>
      </span>
    </Card>
  );
}
