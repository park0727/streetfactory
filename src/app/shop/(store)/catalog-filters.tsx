"use client";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebouncedParam, useUrlFilters } from "@/hooks/use-url-filters";

type BrandChip = { id: number; name: string; logoUrl: string | null };

export function CatalogFilters({ cats, brands }: { cats: { id: number; name: string }[]; brands: BrandChip[] }) {
  const { get, set } = useUrlFilters();
  const [q, setQ] = useDebouncedParam("q");
  const cur = get("cat");
  const curBrand = get("brand");
  // 로고를 못 불러오면 이름으로 보여 준다
  const [broken, setBroken] = useState<Set<number>>(new Set());
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
              onClick={() => set({ cat: c.id === 0 ? null : String(c.id), brand: null, n: null })}
              className={cn("h-8 shrink-0 rounded-full border px-3.5 text-[13px] whitespace-nowrap", on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground")}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      {brands.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="브랜드로 보기">
          {brands.map((b) => {
            const on = curBrand === String(b.id);
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                title={b.name}
                onClick={() => set({ brand: on ? null : String(b.id), n: null })}
                className={cn(
                  "flex h-11 min-w-[84px] shrink-0 items-center justify-center rounded-md border bg-white px-3 transition-shadow",
                  on ? "border-primary ring-2 ring-primary" : "hover:border-foreground/30",
                )}
              >
                {b.logoUrl && !broken.has(b.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 업로드한 로고 원본
                  <img src={b.logoUrl} alt={b.name} className="h-6 w-auto max-w-[96px] object-contain" onError={() => setBroken((s0) => new Set(s0).add(b.id))} />
                ) : (
                  <span className="text-[12.5px] font-semibold tracking-wide text-foreground uppercase">{b.name}</span>
                )}
              </button>
            );
          })}
          {curBrand && (
            <button type="button" onClick={() => set({ brand: null, n: null })} className="flex h-11 shrink-0 items-center gap-1 rounded-md px-2 text-[12.5px] text-steel">
              <X className="size-3.5" /> 브랜드 해제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
