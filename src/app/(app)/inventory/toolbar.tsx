"use client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedParam, useUrlFilters } from "@/hooks/use-url-filters";

export function InventoryToolbar({ cats }: { cats: { id: number; name: string }[] }) {
  const { get, set } = useUrlFilters();
  const [q, setQ] = useDebouncedParam("q");
  const hasFilter = !!(get("q") || get("cat") || get("stock") || get("disc"));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-steel" />
        <Input id="inv-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="코드 · 부품명 · 호환기종 검색" className="bg-card pl-8" aria-label="재고 검색" />
      </div>
      <Select value={get("stock") || "all"} onValueChange={(v) => set({ stock: v })}>
        <SelectTrigger className="w-[150px] bg-card" aria-label="재고 상태">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 재고 상태</SelectItem>
          <SelectItem value="alert">발주 필요 (부족+품절)</SelectItem>
          <SelectItem value="low">안전재고 부족</SelectItem>
          <SelectItem value="out">품절</SelectItem>
          <SelectItem value="ok">정상</SelectItem>
        </SelectContent>
      </Select>
      <Select value={get("cat") || "all"} onValueChange={(v) => set({ cat: v })}>
        <SelectTrigger className="w-[150px] bg-card" aria-label="카테고리">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 카테고리</SelectItem>
          {cats.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-1.5 text-[13px] text-steel">
        <input type="checkbox" className="accent-primary" checked={get("disc") === "1"} onChange={(e) => set({ disc: e.target.checked ? "1" : null })} />
        단종 포함
      </label>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); set({ q: null, cat: null, stock: null, disc: null }); }}>
          <X /> 초기화
        </Button>
      )}
    </div>
  );
}
