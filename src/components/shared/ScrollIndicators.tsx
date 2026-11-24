"use client";

import { useEffect } from "react";

export function ScrollIndicators() {
  useEffect(() => {
    const timers = new Map<Element, number>();
    const onScroll = (event: Event) => {
      const target = event.target === document ? document.documentElement : event.target;
      if (!(target instanceof Element)) return;
      target.classList.add("is-scrolling");
      const previous = timers.get(target);
      if (previous !== undefined) window.clearTimeout(previous);
      timers.set(target, window.setTimeout(() => {
        target.classList.remove("is-scrolling");
        timers.delete(target);
      }, 1000));
    };
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      timers.forEach((timer, target) => {
        window.clearTimeout(timer);
        target.classList.remove("is-scrolling");
      });
    };
  }, []);
  return null;
}
