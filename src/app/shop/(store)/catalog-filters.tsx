"use client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebouncedParam, useUrlFilters } from "@/hooks/use-url-filters";

export function CatalogFilters({ cats }: { cats: { id: number; name: string }[] }) {
  const { get, set } = useUrlFilters();
  const [q, setQ] = useDebouncedParam("q");
  const cur = get("cat");
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-steel" />
        <Input id="shop-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="부품명 · 코드 · 차종 검색" className="h-11 bg-card pr-9 pl-9 text-base" aria-label="상품 검색" enterKeyHint="search" />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-steel" aria-label="검색어 지우기">
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[{ id: 0, name: "전체" }, ...cats].map((c) => {
          const on = c.id === 0 ? !cur : cur === String(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => set({ cat: c.id === 0 ? null : String(c.id), n: null })}
              className={cn("h-8 shrink-0 rounded-full border px-3.5 text-[13px] whitespace-nowrap", on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground")}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
