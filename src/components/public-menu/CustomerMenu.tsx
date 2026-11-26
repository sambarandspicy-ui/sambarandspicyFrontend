"use client";

/* eslint-disable @next/next/no-img-element -- Dish images can be uploaded paths or demo data URLs. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUp,
  BookOpen,
  LayoutGrid,
  List,
  MapPin,
  Maximize,
  Minimize,
  Search,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { DietaryBadge } from "@/components/shared/dietary-badge";
import { DishFallbackArt } from "@/components/public-menu/DishArt";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR, resolveAssetUrl } from "@/lib/format";
import { api, dataMode } from "@/services/api";
import { browserStorage, loadPublicMenuCached } from "@/services/public-menu-cache";
import type { PublicMenu } from "@/types/domain";

type PublicMenuItem = PublicMenu["items"][number];

function subscribeFullscreen(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}
function fullscreenState() {
  if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) return 0;
  return document.fullscreenElement ? 2 : 1;
}

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}
function getScrolledPastHero() {
  return window.scrollY > 360;
}

const DIET_OPTIONS = [
  { key: "ALL", label: "All", activeClass: "bg-[#17552f] text-white shadow-xs" },
  {
    key: "VEG",
    label: "Veg",
    activeClass: "bg-[#17552f] text-white ring-1 ring-[#17552f] shadow-xs",
  },
  {
    key: "NON_VEG",
    label: "Non-Veg",
    activeClass: "bg-[#8c2720] text-white ring-1 ring-[#8c2720] shadow-xs",
  },
  {
    key: "EGG",
    label: "Egg",
    activeClass: "bg-[#9c6313] text-white ring-1 ring-[#9c6313] shadow-xs",
  },
] as const;

export function CustomerMenu() {
  const { data: cached, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-menu", dataMode],
    queryFn: () => loadPublicMenuCached(() => api.getPublicMenu(), dataMode, browserStorage()),
    staleTime: (query) => Math.max(0, (query.state.data?.expiresAt ?? 0) - query.state.dataUpdatedAt),
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.status === "error"
        ? 60_000
        : Math.max(1_000, (query.state.data?.expiresAt ?? Date.now() + 300_000) - Date.now()),
  });
  const data = cached?.menu;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const [diet, setDiet] = useState<"ALL" | "VEG" | "NON_VEG" | "EGG">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, true>>({});
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);
  const modalTokenCounterRef = useRef(0);
  const activeModalTokenRef = useRef<number | null>(null);
  const categoryBtnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const showBackToTop = useSyncExternalStore(subscribeScroll, getScrolledPastHero, () => false);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      const activeToken = activeModalTokenRef.current;
      if (activeToken === null) return;
      const stateToken =
        event.state && typeof event.state === "object"
          ? (event.state as { customerMenuDishToken?: number }).customerMenuDishToken
          : undefined;
      if (stateToken !== activeToken) {
        activeModalTokenRef.current = null;
        setSelectedItem(null);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function openItem(item: PublicMenuItem) {
    const token = ++modalTokenCounterRef.current;
    activeModalTokenRef.current = token;
    try {
      const currentState =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      window.history.pushState({ ...currentState, customerMenuDishToken: token }, "");
    } catch {
      // Ignore history errors in restricted browser contexts.
    }
    setSelectedItem(item);
  }

  function closeItem() {
    const activeToken = activeModalTokenRef.current;
    activeModalTokenRef.current = null;
    setSelectedItem(null);
    if (activeToken !== null) {
      try {
        const currentToken =
          window.history.state && typeof window.history.state === "object"
            ? (window.history.state as { customerMenuDishToken?: number }).customerMenuDishToken
            : undefined;
        if (currentToken === activeToken) {
          window.history.back();
        }
      } catch {
        // Ignore history errors in restricted browser contexts.
      }
    }
  }

  const fullscreen = useSyncExternalStore(subscribeFullscreen, fullscreenState, () => 0);
  const [fullscreenError, setFullscreenError] = useState(false);
  async function toggleFullscreen() {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError(true);
    }
  }

  const term = search.trim().toLowerCase();

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of data?.categories ?? []) map.set(c.id, c.name);
    return map;
  }, [data?.categories]);

  const dietAndSearchMatches = useMemo(() => {
    return (data?.items ?? []).filter(
      (item) =>
        (diet === "ALL" || item.dietaryType === diet) &&
        (!term ||
          item.name.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term) ||
          categoryNameById.get(item.categoryId)?.toLowerCase().includes(term)),
    );
  }, [data?.items, diet, term, categoryNameById]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const item of dietAndSearchMatches) {
      counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [dietAndSearchMatches]);

  const visible = useMemo(() => {
    return category === null
      ? dietAndSearchMatches
      : dietAndSearchMatches.filter((item) => item.categoryId === category);
  }, [dietAndSearchMatches, category]);

  const groupedSections = useMemo(() => {
    if (category !== null || term || !data?.categories.length) return null;
    const byCategory = new Map<number, PublicMenuItem[]>();
    for (const item of visible) {
      const list = byCategory.get(item.categoryId);
      if (list) list.push(item);
      else byCategory.set(item.categoryId, [item]);
    }
    const ordered: { id: number; name: string; items: PublicMenuItem[] }[] = [];
    for (const cat of data.categories) {
      const catItems = byCategory.get(cat.id);
      if (catItems && catItems.length > 0) {
        ordered.push({ id: cat.id, name: cat.name, items: catItems });
        byCategory.delete(cat.id);
      }
    }
    for (const [id, leftover] of byCategory.entries()) {
      ordered.push({ id, name: "More Dishes", items: leftover });
    }
    return ordered;
  }, [category, term, data, visible]);

  function selectCategory(catId: number | null) {
    setCategory(catId);
    if (catId !== null) {
      categoryBtnRefs.current[catId]?.scrollIntoView?.({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }

  function jumpToCategory(catId: number) {
    setQuickJumpOpen(false);
    if (category !== null || term) {
      selectCategory(catId);
      window.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }
    const section = document.getElementById(`menu-cat-${catId}`);
    if (section?.scrollIntoView) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      selectCategory(catId);
    }
  }

  function resetFilters() {
    setSearch("");
    setCategory(null);
    setDiet("ALL");
  }

  function renderDishMedia(item: PublicMenuItem, compact = false) {
    const catName = categoryNameById.get(item.categoryId);
    if (item.imagePath && !failedImages[item.id]) {
      return (
        <img
          loading="lazy"
          decoding="async"
          src={resolveAssetUrl(item.imagePath, "/images/dish.svg")}
          alt=""
          onError={() =>
            setFailedImages((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }))
          }
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      );
    }
    return (
      <DishFallbackArt
        name={item.name}
        categoryName={catName}
        dietaryType={item.dietaryType}
        compact={compact}
      />
    );
  }

  function renderDishCard(item: PublicMenuItem) {
    const catName = categoryNameById.get(item.categoryId);
    const hasHalf = item.hasHalfPortion && item.halfSellingPrice != null;

    if (viewMode === "list") {
      return (
        <article
          key={item.id}
          className="group min-w-0 overflow-hidden rounded-2xl border border-[#dce4d3] bg-white shadow-[0_2px_10px_rgba(9,43,22,0.05)] transition-all hover:border-[#b58a27]/50 hover:shadow-[0_6px_18px_rgba(9,43,22,0.09)]"
        >
          <button
            type="button"
            onClick={() => openItem(item)}
            className="flex w-full min-w-0 cursor-pointer items-stretch gap-3 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17552f] sm:gap-4 sm:p-3.5"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-1.5">
                {item.dietaryType !== "UNSPECIFIED" && <DietaryBadge type={item.dietaryType} />}
                {catName && (
                  <span className="truncate text-[10px] font-bold uppercase tracking-wider text-[#98762c]">
                    {catName}
                  </span>
                )}
              </div>
              <h3 className="mt-1 break-words text-sm font-bold leading-5 text-[#183223] sm:text-base">
                {item.name}
              </h3>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-4.5 text-[#5c6e60]">
                  {item.description}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
                <span className="inline-flex items-center rounded-lg bg-[#edf4ea] px-2 py-0.5 text-sm font-extrabold tabular-nums text-[#17552f]">
                  {hasHalf ? `Full ${formatINR(item.sellingPrice)}` : formatINR(item.sellingPrice)}
                </span>
                {hasHalf && (
                  <span className="inline-flex items-center rounded-lg border border-[#dce4d3] bg-[#f7f5eb] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#425c49]">
                    Half {formatINR(item.halfSellingPrice!)}
                  </span>
                )}
              </div>
            </div>
            <div className="relative size-[84px] shrink-0 self-center overflow-hidden rounded-xl border border-[#dce4d3]/70 bg-[#edf1e6] sm:size-24">
              {renderDishMedia(item, true)}
            </div>
          </button>
        </article>
      );
    }

    return (
      <article
        key={item.id}
        className="group min-w-0 overflow-hidden rounded-2xl border border-[#dce4d3] bg-white shadow-[0_2px_10px_rgba(9,43,22,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#b58a27]/50 hover:shadow-[0_8px_22px_rgba(9,43,22,0.1)]"
      >
        <button
          type="button"
          onClick={() => openItem(item)}
          className="flex h-full w-full min-w-0 cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17552f]"
        >
          <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#edf1e6]">
            {renderDishMedia(item)}
            {item.dietaryType !== "UNSPECIFIED" && (
              <span className="absolute left-2 top-2 grid size-7 place-items-center rounded-lg border border-black/5 bg-white/95 shadow-sm backdrop-blur-xs">
                <DietaryBadge type={item.dietaryType} />
              </span>
            )}
            {hasHalf && (
              <span className="absolute right-2 top-2 rounded-full border border-[#b58a27]/35 bg-[#fffdf5]/95 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#7c5c17] shadow-2xs backdrop-blur-xs">
                Half &amp; Full
              </span>
            )}
          </div>
          <div className="flex w-full flex-1 flex-col p-3 sm:p-3.5">
            {catName && (
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#98762c]">
                {catName}
              </p>
            )}
            <h3 className="mt-0.5 line-clamp-2 break-words text-sm font-bold leading-snug text-[#183223] sm:text-base">
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-4.5 text-[#5c6e60]">
                {item.description}
              </p>
            )}
            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
              <span className="inline-flex items-center rounded-lg bg-[#edf4ea] px-2 py-0.5 text-sm font-extrabold tabular-nums text-[#17552f] sm:text-base">
                {formatINR(item.sellingPrice)}
              </span>
              {hasHalf && (
                <span className="text-[11px] font-semibold tabular-nums text-[#5c6e60]">
                  · Half {formatINR(item.halfSellingPrice!)}
                </span>
              )}
            </div>
          </div>
        </button>
      </article>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5eb] text-[#183223]" style={{ colorScheme: "light" }}>
      <header className="border-b border-[#ebc96f]/25 bg-[#092b16] text-[#fff7dc]">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <img
            src="/images/customer-menu-logo.png"
            alt="Sambar & Spicy logo"
            className="size-10 shrink-0 rounded-full border border-[#d6b45e]/80 object-cover shadow-xs sm:size-12"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight sm:text-lg">
              {data?.store.name || "Sambar & Spicy"}
            </p>
            <p className="truncate text-[11px] text-[#e1c983] sm:text-xs">
              Authentic flavours, heartfelt taste
            </p>
          </div>
          {fullscreen > 0 && (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen === 2 ? "Exit full screen" : "View full screen"}
              className="ml-auto flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[#ebc96f]/45 bg-white/10 px-2.5 text-xs font-semibold text-[#fff7dc] backdrop-blur-xs transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ebc96f] sm:gap-2 sm:px-3.5"
            >
              {fullscreen === 2 ? <Minimize size={16} /> : <Maximize size={16} />}
              <span>{fullscreen === 2 ? "Exit" : "Full screen"}</span>
            </button>
          )}
        </div>
        {fullscreenError && (
          <p role="status" className="mx-auto max-w-6xl px-4 pb-2.5 text-xs text-[#fff7dc] sm:px-6">
            Full screen is unavailable in this browser.
          </p>
        )}
      </header>

      <section className="relative overflow-hidden border-b border-[#ebc96f]/35 bg-gradient-to-br from-[#092b16] via-[#103b20] to-[#0a3019] text-[#fff9e9]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_24%,rgba(235,201,111,0.18),transparent_52%),radial-gradient(circle_at_12%_80%,rgba(34,118,67,0.28),transparent_55%)]"
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:gap-8 sm:px-6 sm:py-6">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ebc96f] sm:text-xs">
              <Sparkles size={12} aria-hidden="true" />
              <span>Welcome to {data?.store.name || "Sambar & Spicy"}</span>
            </p>
            <h1 className="mt-1.5 font-serif text-2xl font-bold leading-[1.08] tracking-tight sm:mt-2 sm:text-4xl">
              Good food. <span className="text-[#ebc96f]">Great moments.</span>
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-3">
              {data?.store.address && (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#ebc96f]/30 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-[#f5eed8] backdrop-blur-xs sm:text-xs">
                  <MapPin size={12} className="shrink-0 text-[#ebc96f]" aria-hidden="true" />
                  <span className="truncate">{data.store.address}</span>
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] font-medium text-[#e3e7d5] sm:text-xs">
                Freshly prepared · Ask our team to order
              </span>
            </div>
          </div>
          <div className="relative shrink-0">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 rounded-full bg-[#ebc96f]/15 blur-md"
            />
            <img
              src="/images/customer-menu-logo.png"
              alt=""
              className="relative size-16 rounded-full border-2 border-[#ebc96f]/75 object-cover shadow-xl sm:size-28 md:size-32"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6 sm:pt-5">
        <div className="flex items-end justify-between gap-3 pb-2.5">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#17552f]">
              Explore the menu
            </p>
            <h2 className="mt-0.5 font-serif text-xl font-bold leading-tight sm:text-3xl">
              Find your favourite
            </h2>
            {data && (
              <p className="mt-0.5 text-xs font-medium tabular-nums text-[#5c6e60] sm:text-sm">
                {visible.length} {visible.length === 1 ? "dish" : "dishes"} available
              </p>
            )}
          </div>
          {data && (
            <div
              role="group"
              aria-label="Menu view mode"
              className="inline-flex shrink-0 rounded-xl border border-[#d7decb] bg-white p-0.5 shadow-2xs"
            >
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`grid size-8 place-items-center rounded-lg transition-colors sm:size-9 ${
                  viewMode === "grid"
                    ? "bg-[#17552f] text-white"
                    : "text-[#5c6e60] hover:text-[#183223]"
                }`}
              >
                <LayoutGrid size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`grid size-8 place-items-center rounded-lg transition-colors sm:size-9 ${
                  viewMode === "list"
                    ? "bg-[#17552f] text-white"
                    : "text-[#5c6e60] hover:text-[#183223]"
                }`}
              >
                <List size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Sticky Search, Dietary & Category Dock */}
        <div className="sticky top-0 z-30 -mx-4 border-b border-[#dce4d3]/85 bg-[#f7f5eb]/95 px-4 pb-2.5 pt-2 shadow-[0_4px_14px_-10px_rgba(9,43,22,0.18)] backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="flex min-h-10 items-center gap-2.5 rounded-xl border border-[#d7decb] bg-white px-3 shadow-2xs transition-shadow focus-within:border-[#b58a27] focus-within:ring-2 focus-within:ring-[#b58a27]/30">
              <Search size={17} className="shrink-0 text-[#607664]" aria-hidden="true" />
              <span className="sr-only">Search dishes</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search dishes or categories..."
                className="min-w-0 flex-1 border-none bg-transparent text-base shadow-none outline-none ring-0 placeholder:text-[#7c8f7f] focus:border-none focus:outline-none focus:ring-0 sm:text-sm [border:none] [outline:none]"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-[#5c6e60] transition-colors hover:bg-black/5"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </label>

            <div
              className="pos-scroll no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-[#d7decb] bg-white p-1 shadow-2xs"
              aria-label="Dietary filters"
            >
              {DIET_OPTIONS.map(({ key, label, activeClass }) => (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  onClick={() => setDiet(key)}
                  aria-pressed={diet === key}
                  className={`flex min-h-8 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold tracking-tight transition-colors sm:flex-initial sm:px-3 sm:text-sm ${
                    diet === key ? activeClass : "text-[#425c49] hover:bg-[#edf1e6]/70"
                  }`}
                >
                  {key !== "ALL" && <DietaryBadge type={key} />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {data && data.categories.length > 0 && (
            <div className="relative mt-2">
              <nav
                aria-label="Menu categories"
                className="pos-scroll no-scrollbar flex gap-1.5 overflow-x-auto pr-8"
              >
                <button
                  type="button"
                  aria-label="All dishes"
                  onClick={() => selectCategory(null)}
                  aria-pressed={category === null}
                  className={`inline-flex min-h-8.5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-colors sm:min-h-9 sm:px-3.5 sm:text-sm ${
                    category === null
                      ? "border-[#17552f] bg-[#17552f] text-white shadow-xs"
                      : "border-[#d7decb] bg-white text-[#425c49] hover:border-[#b58a27]/50"
                  }`}
                >
                  <span>All dishes</span>
                  <span
                    aria-hidden="true"
                    className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums ${
                      category === null ? "bg-white/20 text-white" : "bg-[#edf1e6] text-[#5c6e60]"
                    }`}
                  >
                    {dietAndSearchMatches.length}
                  </span>
                </button>
                {data.categories.map((c) => {
                  const count = categoryCounts.get(c.id) ?? 0;
                  const active = category === c.id;
                  return (
                    <button
                      key={c.id}
                      ref={(el) => {
                        categoryBtnRefs.current[c.id] = el;
                      }}
                      type="button"
                      aria-label={c.name}
                      onClick={() => selectCategory(c.id)}
                      aria-pressed={active}
                      className={`inline-flex min-h-8.5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-colors sm:min-h-9 sm:px-3.5 sm:text-sm ${
                        active
                          ? "border-[#17552f] bg-[#17552f] text-white shadow-xs"
                          : "border-[#d7decb] bg-white text-[#425c49] hover:border-[#b58a27]/50"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span
                        aria-hidden="true"
                        className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums ${
                          active ? "bg-white/20 text-white" : "bg-[#edf1e6] text-[#5c6e60]"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#f7f5eb] to-transparent"
              />
            </div>
          )}
        </div>

        {isError && data && (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Showing the last loaded menu. Please confirm prices and availability with our team.
          </p>
        )}

        {isLoading ? (
          <div className="mt-5">
            <p role="status" className="sr-only">
              Loading today&apos;s menu...
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  aria-hidden="true"
                  className="overflow-hidden rounded-2xl border border-[#dce4d3] bg-white"
                >
                  <div className="aspect-[16/11] animate-pulse bg-[#e6ece0]" />
                  <div className="space-y-2 p-3">
                    <div className="h-2.5 w-16 animate-pulse rounded bg-[#e6ece0]" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#e6ece0]" />
                    <div className="h-6 w-20 animate-pulse rounded-lg bg-[#e6ece0]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isError && !data ? (
          <div className="py-16 text-center">
            <p className="font-semibold">The menu could not be loaded.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 min-h-11 rounded-xl bg-[#17552f] px-5 py-2.5 text-sm font-bold text-white"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cad6bf] bg-white px-4 py-14 text-center">
            <UtensilsCrossed className="mx-auto size-8 text-[#829585]" aria-hidden="true" />
            <p className="mt-3 font-bold text-[#183223]">No dishes found</p>
            <p className="mt-1 text-sm text-[#5c6e60]">
              {term || category !== null || diet !== "ALL"
                ? "Try another search or reset your active filters."
                : "Please check back a little later."}
            </p>
            {(term || category !== null || diet !== "ALL") && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#17552f] px-4 py-2 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#103b20]"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : groupedSections ? (
          <div className="mt-5 space-y-8">
            {groupedSections.map((section) => (
              <section
                key={section.id}
                id={`menu-cat-${section.id}`}
                className="scroll-mt-36"
              >
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="font-serif text-lg font-bold tracking-tight text-[#103b20] sm:text-xl">
                    {section.name}
                  </h3>
                  <span className="rounded-full border border-[#b58a27]/30 bg-[#f3ecda] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#7c5c17]">
                    {section.items.length}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-gradient-to-r from-[#b58a27]/35 to-transparent"
                  />
                </div>
                <div
                  className={
                    viewMode === "list"
                      ? "grid grid-cols-1 gap-3 md:grid-cols-2"
                      : "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
                  }
                >
                  {section.items.map((item) => renderDishCard(item))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div
            className={
              viewMode === "list"
                ? "mt-5 grid grid-cols-1 gap-3 md:grid-cols-2"
                : "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
            }
          >
            {visible.map((item) => renderDishCard(item))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-[#647566]">
          Prices are in Indian rupees. Please confirm availability and prices with our team when ordering.
        </p>
      </div>

      {/* Floating Back-to-Top Pill */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo?.({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="pb-safe fixed bottom-5 left-4 z-40 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#dce4d3] bg-white/95 px-3.5 py-2 text-xs font-bold text-[#183223] shadow-lg backdrop-blur-md transition-transform hover:scale-[1.02]"
        >
          <ArrowUp size={14} aria-hidden="true" />
          <span>Top</span>
        </button>
      )}

      {/* Floating Quick-Jump Menu FAB */}
      {data && data.categories.length > 1 && !selectedItem && (
        <div className="pb-safe fixed bottom-5 right-4 z-40">
          {quickJumpOpen && (
            <>
              <div
                aria-hidden="true"
                onClick={() => setQuickJumpOpen(false)}
                className="fixed inset-0 bg-[#092b16]/40 backdrop-blur-[1px]"
              />
              <div
                role="menu"
                aria-label="Jump to category"
                className="pos-scroll relative z-10 mb-2.5 max-h-[60dvh] w-64 overflow-y-auto rounded-2xl border border-[#b99a46]/40 bg-[#092b16] p-2 text-[#fff7dc] shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-[#b99a46]/25 px-3 py-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ebc96f]">
                    Categories
                  </span>
                  <button
                    type="button"
                    aria-label="Close categories menu"
                    onClick={() => setQuickJumpOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-[#e1c983] hover:bg-white/10"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-1 space-y-0.5">
                  {data.categories.map((c) => {
                    const count = categoryCounts.get(c.id) ?? 0;
                    if (count === 0) return null;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="menuitem"
                        onClick={() => jumpToCategory(c.id)}
                        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-left text-sm font-semibold text-[#fff7dc] transition-colors hover:bg-[#17552f]"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="shrink-0 rounded-full bg-[#ebc96f]/20 px-2 py-0.5 text-xs font-bold tabular-nums text-[#ebc96f]">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          <button
            type="button"
            aria-expanded={quickJumpOpen}
            onClick={() => setQuickJumpOpen((prev) => !prev)}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-[#ebc96f]/55 bg-[#092b16] px-4 py-2 text-sm font-bold text-[#ebc96f] shadow-xl transition-transform hover:scale-[1.03] active:scale-95"
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>Menu</span>
          </button>
        </div>
      )}

      {/* Dish Detail Preview (Bottom Sheet on phones, centered modal on desktop) */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) closeItem();
        }}
      >
        <DialogContent
          showClose={false}
          className="flex max-h-[90dvh] w-full flex-col overflow-hidden border-[#dce4d3] bg-[#f7f5eb] p-0 text-[#183223] shadow-2xl max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-3xl sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:rounded-2xl"
          style={{ colorScheme: "light" }}
        >
          {selectedItem && (
            <>
              <DialogClose
                aria-label="Close"
                className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-black/15 bg-white/95 text-[#183223] shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17552f] sm:size-10"
              >
                <X className="size-5 stroke-[2.25]" aria-hidden="true" />
              </DialogClose>
              <div className="pos-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                <div className="relative aspect-[16/10] max-h-[38dvh] w-full shrink-0 overflow-hidden bg-[#edf1e6]">
                  {renderDishMedia(selectedItem)}
                  {selectedItem.dietaryType !== "UNSPECIFIED" && (
                    <span className="absolute left-3 top-3 z-10 inline-flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-sm">
                      <DietaryBadge type={selectedItem.dietaryType} />
                      <span>
                        {selectedItem.dietaryType === "VEG"
                          ? "Veg"
                          : selectedItem.dietaryType === "NON_VEG"
                            ? "Non-Veg"
                            : "Egg"}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-3 bg-white p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
                  {categoryNameById.get(selectedItem.categoryId) && (
                    <p className="break-words text-[11px] font-bold uppercase tracking-wider text-[#98762c] sm:text-xs">
                      {categoryNameById.get(selectedItem.categoryId)}
                    </p>
                  )}
                  <DialogTitle className="break-words font-serif text-xl font-bold leading-tight text-[#183223] sm:text-2xl">
                    {selectedItem.name}
                  </DialogTitle>
                  <DialogDescription className="whitespace-pre-line break-words text-sm leading-relaxed text-[#425c49]">
                    {selectedItem.description || "Ask our team for today's preparation details."}
                  </DialogDescription>
                  <div className="grid grid-cols-1 gap-2 border-t border-[#dce4d3] pt-3 min-[360px]:grid-cols-2">
                    <div className="rounded-xl border border-[#17552f]/15 bg-[#edf4ea]/70 px-3.5 py-2.5">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-[#425c49]">
                        {selectedItem.hasHalfPortion ? "Full plate" : "Price"}
                      </span>
                      <strong className="mt-0.5 block text-lg font-extrabold tabular-nums text-[#17552f] sm:text-xl">
                        {formatINR(selectedItem.sellingPrice)}
                      </strong>
                    </div>
                    {selectedItem.hasHalfPortion && selectedItem.halfSellingPrice != null && (
                      <div className="rounded-xl border border-[#b58a27]/25 bg-[#f3ecda]/70 px-3.5 py-2.5">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-[#7c5c17]">
                          Half plate
                        </span>
                        <strong className="mt-0.5 block text-lg font-extrabold tabular-nums text-[#7c5c17] sm:text-xl">
                          {formatINR(selectedItem.halfSellingPrice)}
                        </strong>
                      </div>
                    )}
                  </div>
                  <p className="rounded-xl bg-[#f7f5eb] px-3 py-2 text-center text-xs font-medium text-[#5c6e60]">
                    Ready to order? Show this to our team
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
