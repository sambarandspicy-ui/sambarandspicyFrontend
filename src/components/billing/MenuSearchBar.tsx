"use client";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
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
    <div className="min-w-0 flex-1">
      <Input
        ref={input}
        containerClassName="h-11 sm:h-10 rounded-xl shadow-2xs"
        aria-label="Search menu items"
        placeholder="Search dishes..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        leadingIcon={<Search size={17} />}
        clearable
        clearLabel="Clear search"
        onClear={() => onChange("")}
        trailingIcon={
          !value ? (
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
              /
            </kbd>
          ) : undefined
        }
      />
    </div>
  );
}
