"use client";

/* eslint-disable @next/next/no-img-element -- Dish images can be uploaded paths or demo data URLs. */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Maximize, Minimize, Search, UtensilsCrossed, X } from "lucide-react";
import { DietaryBadge } from "@/components/shared/dietary-badge";
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

function subscribeFullscreen(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}
function fullscreenState() {
  if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) return 0;
  return document.fullscreenElement ? 2 : 1;
}

export function CustomerMenu() {
  const { data: cached, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-menu", dataMode],
    queryFn: () => loadPublicMenuCached(() => api.getPublicMenu(), dataMode, browserStorage()),
    staleTime: query => Math.max(0, (query.state.data?.expiresAt ?? 0) - query.state.dataUpdatedAt),
    refetchOnWindowFocus: true,
    refetchInterval: query => query.state.status === "error" ? 60_000 : Math.max(1_000, (query.state.data?.expiresAt ?? Date.now() + 300_000) - Date.now()),
  });
  const data = cached?.menu;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<number | null>(null);
  const [diet, setDiet] = useState<"ALL" | "VEG" | "NON_VEG" | "EGG">("ALL");
  const [selectedItem, setSelectedItem] = useState<NonNullable<typeof data>["items"][number] | null>(null);
  const modalTokenCounterRef = useRef(0);
  const activeModalTokenRef = useRef<number | null>(null);
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
  function openItem(item: NonNullable<typeof data>["items"][number]) {
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
  const visible = (data?.items ?? []).filter(item =>
    (category === null || item.categoryId === category) &&
    (diet === "ALL" || item.dietaryType === diet) &&
    (!term || item.name.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term) ||
      data?.categories.find(c => c.id === item.categoryId)?.name.toLowerCase().includes(term)));

  return (
    <main className="min-h-screen bg-[#f7f5eb] text-[#183223]" style={{ colorScheme: "light" }}>
      <header className="border-b border-[#b99a46]/40 bg-[#092b16] text-[#fff7dc]">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3 sm:gap-3 sm:px-6">
          <img src="/images/customer-menu-logo.png" alt="Sambar & Spicy logo" className="size-12 shrink-0 rounded-full border border-[#d6b45e] object-cover sm:size-16" />
          <div className="min-w-0 flex-1"><p className="truncate text-base font-bold tracking-tight sm:text-xl">{data?.store.name || "Sambar & Spicy"}</p><p className="truncate text-xs text-[#e1c983]">Authentic flavours, heartfelt taste</p></div>
          {fullscreen > 0 && <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen === 2 ? "Exit full screen" : "View full screen"} className="ml-auto flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#b99a46]/60 px-2.5 text-xs font-bold text-[#fff7dc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ebc96f] sm:gap-2 sm:px-3">{fullscreen === 2 ? <Minimize size={18} /> : <Maximize size={18} />}<span>{fullscreen === 2 ? "Exit" : "Full screen"}</span></button>}
        </div>
        {fullscreenError && <p role="status" className="mx-auto max-w-6xl px-4 pb-3 text-sm text-[#fff7dc] sm:px-6">Full screen is unavailable in this browser.</p>}
      </header>
      <section className="overflow-hidden bg-[#103b20] text-[#fff9e9]">
        <div className="mx-auto grid max-w-6xl items-center gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-10 md:grid-cols-[1fr_220px] md:py-12">
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-[0.2em] text-[#ebc96f] sm:mb-3">Welcome to {data?.store.name || "Sambar & Spicy"}</p>
            <h1 className="max-w-xl font-serif text-3xl font-bold leading-[1.06] tracking-tight sm:text-4xl lg:text-5xl">Good food.<br /><span className="text-[#ebc96f]">Great moments.</span></h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#e3e7d5] sm:mt-4 sm:text-base">Explore our menu, find your favourites, and ask our team to place your order.</p>
            {data?.store.address && <p className="mt-3 text-xs font-medium text-[#d8dfc6] sm:mt-4">{data.store.address}</p>}
          </div>
          <img src="/images/customer-menu-logo.png" alt="" className="mx-auto aspect-square w-28 rounded-full border-2 border-[#c9a85b] object-cover shadow-xl sm:w-40 md:w-full" />
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-7">
        <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#17552f]">Explore the menu</p><h2 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">Find your favourite</h2></div>
          {data && <p className="text-sm font-medium text-[#5c6e60]">{visible.length} {visible.length === 1 ? "dish" : "dishes"} available</p>}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#d7decb] bg-white px-4 shadow-sm transition-shadow focus-within:border-[#b58a27] focus-within:ring-2 focus-within:ring-[#b58a27]/30">
            <Search size={19} className="shrink-0 text-[#708773]" /><span className="sr-only">Search dishes</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dishes or categories..."
              className="min-w-0 flex-1 border-none bg-transparent text-sm shadow-none outline-none ring-0 placeholder:text-[#829585] focus:border-none focus:outline-none focus:ring-0 focus-visible:border-none focus-visible:outline-none focus-visible:ring-0 [border:none] [outline:none]"
            />
            {search && <button type="button" aria-label="Clear search" onClick={()=>setSearch("")} className="grid size-8 place-items-center rounded-full text-[#5c6e60] hover:bg-black/5"><X size={16}/></button>}
          </label>
          <div className="pos-scroll flex gap-1 overflow-x-auto rounded-2xl border border-[#d7decb] bg-white p-1" aria-label="Dietary filters">
            {([["ALL","All"],["VEG","Veg"],["NON_VEG","Non-veg"],["EGG","Egg"]] as const).map(([key,label])=><button key={key} type="button" aria-label={label} onClick={()=>setDiet(key)} aria-pressed={diet===key} className={`flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-xs font-semibold sm:flex-initial sm:px-3 sm:text-sm ${diet===key?"bg-[#17552f] text-white":"text-[#425c49]"}`}>{key!=="ALL"&&<DietaryBadge type={key}/>} {label}</button>)}
          </div>
        </div>
        {data && data.categories.length > 0 && <nav aria-label="Menu categories" className="pos-scroll mt-4 flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={()=>setCategory(null)} aria-pressed={category===null} className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-bold ${category===null?"border-[#17552f] bg-[#17552f] text-white":"border-[#d7decb] bg-white text-[#425c49]"}`}>All dishes</button>
          {data.categories.map(c=><button key={c.id} type="button" onClick={()=>setCategory(c.id)} aria-pressed={category===c.id} className={`min-h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-bold ${category===c.id?"border-[#17552f] bg-[#17552f] text-white":"border-[#d7decb] bg-white text-[#425c49]"}`}>{c.name}</button>)}
        </nav>}
        {isError && data && <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Showing the last loaded menu. Please confirm prices and availability with our team.</p>}
        {isLoading ? <p role="status" className="py-16 text-center text-[#5c6e60]">Loading today&apos;s menu...</p> : isError && !data ? <div className="py-16 text-center"><p className="font-semibold">The menu could not be loaded.</p><button type="button" onClick={()=>void refetch()} className="mt-4 rounded-xl bg-[#17552f] px-5 py-3 text-sm font-bold text-white">Try again</button></div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cad6bf] bg-white py-16 text-center"><UtensilsCrossed className="mx-auto text-[#829585]" /><p className="mt-3 font-bold">No dishes found</p><p className="mt-1 text-sm text-[#5c6e60]">{term || category || diet !== "ALL" ? "Try another search or filter." : "Please check back a little later."}</p></div> :
          <div className="mt-5 grid grid-cols-1 gap-3 min-[340px]:grid-cols-2 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {visible.map(item=><article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#dce4d3] bg-white shadow-[0_4px_20px_rgba(16,59,32,0.07)] transition-transform hover:-translate-y-0.5">
              <button
                type="button"
                onClick={() => openItem(item)}
                className="flex h-full w-full min-w-0 cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17552f]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#edf1e6]">
                  <img loading="lazy" decoding="async" src={resolveAssetUrl(item.imagePath,"/images/dish.svg")} alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/images/dish.svg";}} className="h-full w-full object-cover" />
                  {item.dietaryType!=="UNSPECIFIED"&&<span className="absolute left-2 top-2 grid size-8 place-items-center rounded-lg bg-white shadow-sm"><DietaryBadge type={item.dietaryType}/></span>}
                </div>
                <div className="flex min-h-28 w-full flex-1 flex-col p-3 sm:min-h-32 sm:p-4">
                  <p className="break-words text-[10px] font-bold uppercase tracking-wider text-[#98762c]">{data?.categories.find(c=>c.id===item.categoryId)?.name}</p>
                  <h3 className="mt-1 break-words text-sm font-bold leading-5 sm:text-base">{item.name}</h3>
                  {item.description&&<p className="mt-1 line-clamp-2 text-xs leading-5 text-[#5c6e60]">{item.description}</p>}
                  <div className="mt-auto pt-3"><span className="text-base font-extrabold text-[#17552f]">{formatINR(item.sellingPrice)}</span>{item.hasHalfPortion && item.halfSellingPrice != null && <p className="mt-0.5 text-xs text-[#5c6e60]">Half {formatINR(item.halfSellingPrice)}</p>}</div>
                </div>
              </button>
            </article>)}
          </div>}
        <p className="mt-10 text-center text-xs text-[#718172]">Prices are in Indian rupees. Please confirm availability and prices with our team when ordering.</p>
      </div>
      <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) closeItem(); }}>
        <DialogContent
          showClose={false}
          className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-2xl border-[#dce4d3] bg-[#f7f5eb] p-0 text-[#183223] shadow-2xl sm:w-full sm:max-w-lg"
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
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                <div className="relative aspect-[16/10] max-h-[42dvh] w-full shrink-0 overflow-hidden bg-[#edf1e6] sm:aspect-[4/3]">
                  <img
                    src={resolveAssetUrl(selectedItem.imagePath, "/images/dish.svg")}
                    alt={selectedItem.name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/dish.svg";
                    }}
                    className="h-full w-full object-cover"
                  />
                  {selectedItem.dietaryType !== "UNSPECIFIED" && (
                    <span className="absolute left-3 top-3 z-10 inline-flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-sm">
                      <DietaryBadge type={selectedItem.dietaryType} />
                      <span>
                        {selectedItem.dietaryType === "VEG"
                          ? "Veg"
                          : selectedItem.dietaryType === "NON_VEG"
                            ? "Non-veg"
                            : "Egg"}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-2.5 bg-white p-4 sm:space-y-3 sm:p-6">
                  <p className="break-words text-[11px] font-bold uppercase tracking-wider text-[#98762c] sm:text-xs">
                    {data?.categories.find((c) => c.id === selectedItem.categoryId)?.name}
                  </p>
                  <DialogTitle className="break-words font-serif text-xl font-bold leading-tight text-[#183223] sm:text-2xl">
                    {selectedItem.name}
                  </DialogTitle>
                  <DialogDescription className="whitespace-pre-line break-words text-sm leading-relaxed text-[#425c49]">
                    {selectedItem.description || "Ask our team for today's preparation details."}
                  </DialogDescription>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[#dce4d3] pt-3">
                    <div>
                      <span className="text-lg font-extrabold text-[#17552f] sm:text-xl">
                        {formatINR(selectedItem.sellingPrice)}
                      </span>
                      {selectedItem.hasHalfPortion && selectedItem.halfSellingPrice != null && (
                        <p className="mt-0.5 text-sm font-medium text-[#5c6e60]">
                          Half plate: {formatINR(selectedItem.halfSellingPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
