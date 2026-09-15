"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/combobox";
import { DateRange } from "@/components/date-range";
import { useDebouncedParam, useUrlFilters } from "@/hooks/use-url-filters";

export function InboundToolbar({ suppliers, from, to }: { suppliers: { id: number; name: string; country: string }[]; from: string; to: string }) {
  const { get, set } = useUrlFilters();
  const [q, setQ] = useDebouncedParam("q");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-[240px]">
        <Combobox id="ib-supplier" value={get("supplier") || "all"} onChange={(v) => set({ supplier: v })} options={[{ value: "all", label: "전체 공급사" }, ...suppliers.map((s) => ({ value: String(s.id), label: s.name, hint: s.country, keywords: s.country }))]} searchPlaceholder="공급사 검색" />
      </div>
      <DateRange from={from} to={to} />
      <div className="relative w-full sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-steel" />
        <Input id="ib-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="입고번호 · 공급사" className="h-9 bg-card pl-8" aria-label="검색" />
      </div>
    </div>
  );
}
