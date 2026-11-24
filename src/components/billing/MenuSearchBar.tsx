"use client";
import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function MenuSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !target?.isContentEditable &&
        !/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "") &&
        !document.querySelector('[role="dialog"]')
      ) {
        e.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="absolute top-3 left-3 text-muted-foreground"
        size={19}
        aria-hidden="true"
      />
      <Input
        ref={input}
        className="h-11 pr-10 pl-10 sm:pr-20"
        aria-label="Search menu items"
        placeholder="Search dishes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 sm:right-8"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={18} />
        </Button>
      )}
      <kbd className="absolute top-3 right-3 hidden text-xs text-muted-foreground sm:block">
        /
      </kbd>
    </div>
  );
}
