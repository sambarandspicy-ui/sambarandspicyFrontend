"use client";
import { useRef } from "react";
import type { DragEvent, MouseEvent, PointerEvent } from "react";

export function useMouseDragScroll() {
  const gesture = useRef<{ pointerId: number; startX: number; scrollLeft: number; dragged: boolean } | null>(null);
  const suppressClick = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    if (event.pointerType !== "mouse" || event.button !== 0 || element.scrollWidth <= element.clientWidth) return;
    // Leave the native scrollbar available for users who prefer it.
    if (event.target === element && event.clientY >= element.getBoundingClientRect().bottom - 8) return;
    suppressClick.current = false;
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: element.scrollLeft, dragged: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const delta = event.clientX - state.startX;
    if (!state.dragged && Math.abs(delta) >= 6) {
      state.dragged = true;
      event.currentTarget.dataset.mouseDragging = "true";
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (state.dragged) {
      event.preventDefault();
      event.currentTarget.scrollLeft = state.scrollLeft - delta;
    }
  }

  function finish(event: PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (!state || state.pointerId !== event.pointerId) return;
    suppressClick.current = state.dragged;
    gesture.current = null;
    delete event.currentTarget.dataset.mouseDragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (state.dragged) setTimeout(() => { suppressClick.current = false; }, 0);
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onClickCapture, onDragStart: (event: DragEvent<HTMLDivElement>) => event.preventDefault() };
}
