"use client";

import { Sparkles, UtensilsCrossed } from "lucide-react";
import type { PublicMenu } from "@/types/domain";

type PublicMenuItem = PublicMenu["items"][number];

const THEME_BY_DIET: Record<
  PublicMenuItem["dietaryType"],
  { bg: string; accent: string; ring: string }
> = {
  VEG: {
    bg: "from-[#eaf2e4] via-[#f6f5eb] to-[#dfead5]",
    accent: "text-[#17552f]",
    ring: "border-[#17552f]/15",
  },
  NON_VEG: {
    bg: "from-[#f7ebe1] via-[#faf4ec] to-[#eedbcc]",
    accent: "text-[#8c3123]",
    ring: "border-[#984b34]/15",
  },
  EGG: {
    bg: "from-[#faf1d8] via-[#fcf8eb] to-[#f1e2b8]",
    accent: "text-[#926014]",
    ring: "border-[#b58a27]/20",
  },
  UNSPECIFIED: {
    bg: "from-[#f2eee1] via-[#f8f5ec] to-[#e7e0cb]",
    accent: "text-[#35553e]",
    ring: "border-[#b58a27]/20",
  },
};

function monogram(categoryName?: string, dishName?: string): string {
  const source = (categoryName || dishName || "Menu").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function DishFallbackArt({
  name,
  categoryName,
  dietaryType,
  compact = false,
}: {
  name: string;
  categoryName?: string;
  dietaryType: PublicMenuItem["dietaryType"];
  compact?: boolean;
}) {
  const palette = THEME_BY_DIET[dietaryType] ?? THEME_BY_DIET.UNSPECIFIED;
  const initials = monogram(categoryName, name);

  return (
    <div
      aria-hidden="true"
      className={`relative flex size-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${palette.bg}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(235,201,111,0.22),transparent_65%)]" />
      <div
        className={`pointer-events-none absolute inset-1.5 rounded-xl border border-dashed ${palette.ring}`}
      />
      <div
        className={`relative grid place-items-center rounded-full border border-[#c9a85b]/35 bg-white/75 shadow-2xs backdrop-blur-[2px] ${
          compact ? "size-9" : "size-12 sm:size-14"
        }`}
      >
        <UtensilsCrossed
          className={`${palette.accent} opacity-80 ${
            compact ? "size-4" : "size-5 sm:size-6"
          }`}
          strokeWidth={1.75}
        />
        {!compact && (
          <Sparkles
            className="absolute -right-1 -top-1 size-3.5 text-[#b58a27]"
            strokeWidth={2}
          />
        )}
      </div>
      {!compact && (
        <div className="relative mt-2 flex items-center gap-1.5 px-3 text-center">
          <span className="rounded-full border border-[#b99a46]/30 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#564823]">
            {categoryName || initials}
          </span>
        </div>
      )}
    </div>
  );
}
