"use client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedParam, useUrlFilters } from "@/hooks/use-url-filters";
import { PARTNER_TYPE } from "@/lib/dates";

export function PartnersToolbar() {
  const { get, set } = useUrlFilters();
  const [q, setQ] = useDebouncedParam("q");
  const has = !!(get("q") || get("type") || get("inactive"));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-steel" />
        <Input id="pt-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="거래처명 · 코드 · 담당자" className="bg-card pl-8" aria-label="거래처 검색" />
      </div>
      <Select value={get("type") || "all"} onValueChange={(v) => set({ type: v })}>
        <SelectTrigger className="w-[150px] bg-card" aria-label="거래처 유형">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 유형</SelectItem>
          {Object.entries(PARTNER_TYPE).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-1.5 text-[13px] text-steel">
        <input type="checkbox" className="accent-primary" checked={get("inactive") === "1"} onChange={(e) => set({ inactive: e.target.checked ? "1" : null })} />
        거래 중지 포함
      </label>
      {has && (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); set({ q: null, type: null, inactive: null }); }}>
          <X /> 초기화
        </Button>
      )}
    </div>
  );
}
