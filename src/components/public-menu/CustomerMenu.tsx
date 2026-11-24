"use client";

/* eslint-disable @next/next/no-img-element -- Dish images can be uploaded paths or demo data URLs. */
import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Maximize, Minimize, Search, UtensilsCrossed, X } from "lucide-react";
import { DietaryBadge } from "@/components/shared/dietary-badge";
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
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <img src="/images/customer-menu-logo.png" alt="Sambar & Spicy logo" className="size-14 shrink-0 rounded-full border border-[#d6b45e] object-cover sm:size-16" />
          <div className="min-w-0"><p className="truncate text-lg font-bold tracking-tight sm:text-xl">{data?.store.name || "Sambar & Spicy"}</p><p className="text-xs text-[#e1c983]">Authentic flavours, heartfelt taste</p></div>
          {fullscreen > 0 && <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen === 2 ? "Exit full screen" : "View full screen"} className="ml-auto flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#b99a46]/60 px-3 text-xs font-bold text-[#fff7dc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ebc96f]">{fullscreen === 2 ? <Minimize size={18} /> : <Maximize size={18} />}<span>{fullscreen === 2 ? "Exit" : "Full screen"}</span></button>}
        </div>
        {fullscreenError && <p role="status" className="mx-auto max-w-6xl px-4 pb-3 text-sm text-[#fff7dc] sm:px-6">Full screen is unavailable in this browser.</p>}
      </header>
      <section className="overflow-hidden bg-[#103b20] text-[#fff9e9]">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:px-6 sm:py-12 md:grid-cols-[1fr_220px]">
          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-[#ebc96f]">Welcome to {data?.store.name || "Sambar & Spicy"}</p>
            <h1 className="max-w-xl font-serif text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl">Good food.<br /><span className="text-[#ebc96f]">Great moments.</span></h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#e3e7d5] sm:text-base">Explore our menu, find your favourites, and ask our team to place your order.</p>
            {data?.store.address && <p className="mt-4 text-xs font-medium text-[#d8dfc6]">{data.store.address}</p>}
          </div>
          <img src="/images/customer-menu-logo.png" alt="" className="mx-auto aspect-square w-36 rounded-full border-2 border-[#c9a85b] object-cover shadow-xl sm:w-40 md:w-full" />
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-7 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#17552f]">Explore the menu</p><h2 className="mt-1 font-serif text-3xl font-bold">Find your favourite</h2></div>
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
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[#d7decb] bg-white p-1" aria-label="Dietary filters">
            {([["ALL","All"],["VEG","Veg"],["NON_VEG","Non-veg"],["EGG","Egg"]] as const).map(([key,label])=><button key={key} type="button" aria-label={label} onClick={()=>setDiet(key)} aria-pressed={diet===key} className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${diet===key?"bg-[#17552f] text-white":"text-[#425c49]"}`}>{key!=="ALL"&&<DietaryBadge type={key}/>} {label}</button>)}
          </div>
        </div>
        {data && data.categories.length > 0 && <nav aria-label="Menu categories" className="pos-scroll mt-4 flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={()=>setCategory(null)} aria-pressed={category===null} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${category===null?"border-[#17552f] bg-[#17552f] text-white":"border-[#d7decb] bg-white text-[#425c49]"}`}>All dishes</button>
          {data.categories.map(c=><button key={c.id} type="button" onClick={()=>setCategory(c.id)} aria-pressed={category===c.id} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${category===c.id?"border-[#17552f] bg-[#17552f] text-white":"border-[#d7decb] bg-white text-[#425c49]"}`}>{c.name}</button>)}
        </nav>}
        {isError && data && <p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Showing the last loaded menu. Please confirm prices and availability with our team.</p>}
        {isLoading ? <p role="status" className="py-16 text-center text-[#5c6e60]">Loading today&apos;s menu...</p> : isError && !data ? <div className="py-16 text-center"><p className="font-semibold">The menu could not be loaded.</p><button type="button" onClick={()=>void refetch()} className="mt-4 rounded-xl bg-[#17552f] px-5 py-3 text-sm font-bold text-white">Try again</button></div> : visible.length === 0 ? <div className="rounded-2xl border border-dashed border-[#cad6bf] bg-white py-16 text-center"><UtensilsCrossed className="mx-auto text-[#829585]" /><p className="mt-3 font-bold">No dishes found</p><p className="mt-1 text-sm text-[#5c6e60]">{term || category || diet !== "ALL" ? "Try another search or filter." : "Please check back a little later."}</p></div> :
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {visible.map(item=><article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#dce4d3] bg-white shadow-[0_4px_20px_rgba(16,59,32,0.07)]">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#edf1e6]">
                <img loading="lazy" decoding="async" src={resolveAssetUrl(item.imagePath,"/images/dish.svg")} alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/images/dish.svg";}} className="h-full w-full object-cover" />
                {item.dietaryType!=="UNSPECIFIED"&&<span className="absolute left-2 top-2 grid size-8 place-items-center rounded-lg bg-white shadow-sm"><DietaryBadge type={item.dietaryType}/></span>}
              </div>
              <div className="flex min-h-32 flex-col p-3 sm:p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#98762c]">{data?.categories.find(c=>c.id===item.categoryId)?.name}</p>
                <h3 className="mt-1 break-words text-sm font-bold leading-5 sm:text-base">{item.name}</h3>
                {item.description&&<p className="mt-1 line-clamp-2 text-xs leading-5 text-[#5c6e60]">{item.description}</p>}
                <div className="mt-auto pt-3"><span className="text-base font-extrabold text-[#17552f]">{formatINR(item.sellingPrice)}</span>{item.hasHalfPortion && item.halfSellingPrice != null && <p className="mt-0.5 text-xs text-[#5c6e60]">Half {formatINR(item.halfSellingPrice)}</p>}</div>
              </div>
            </article>)}
          </div>}
        <p className="mt-10 text-center text-xs text-[#718172]">Prices are in Indian rupees. Please confirm availability and prices with our team when ordering.</p>
      </div>
    </main>
  );
}
