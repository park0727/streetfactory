"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/combobox";
import { DateRange } from "@/components/date-range";
import { useDebouncedParam, useUrlFilters } from "@/hooks/use-url-filters";

export function LedgerToolbar({ partners, from, to }: { partners: { id: number; name: string; code: string }[]; from: string; to: string }) {
  const { get, set } = useUrlFilters();
  const [q, setQ] = useDebouncedParam("q");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-[260px]">
        <Combobox
          id="lg-partner"
          value={get("partner") || "all"}
          onChange={(v) => set({ partner: v })}
          options={[{ value: "all", label: "전체 거래처" }, ...partners.map((p) => ({ value: String(p.id), label: p.name, keywords: p.code }))]}
          searchPlaceholder="거래처 검색"
        />
      </div>
      <DateRange from={from} to={to} />
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-steel" />
        <Input id="lg-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="전표번호 · 부품" className="h-9 bg-card pl-8" aria-label="검색" />
      </div>
    </div>
  );
}
