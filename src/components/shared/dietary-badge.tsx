import type { MenuItem } from "@/types/domain";

export function DietaryBadge({ type }: { type: MenuItem["dietary_type"] }) {
  if (!type || type === "UNSPECIFIED") return null;
  const labels = { VEG: "Veg", NON_VEG: "Non-Veg", EGG: "Egg" } as const;
  const colors = {
    VEG: "text-green-700",
    NON_VEG: "text-red-700",
    EGG: "text-amber-700",
  } as const;
  return (
    <span
      role="img"
      aria-label={labels[type]}
      className={`inline-grid size-4 shrink-0 place-items-center rounded-sm border ${colors[type]}`}
    >
      <span className="size-2 rounded-full bg-current" />
    </span>
  );
}
