"use client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedParam, useUrlFilters } from "@/hooks/use-url-filters";
import { PART_STATUS } from "@/lib/parts-shared";

type Props = { cats: { id: number; name: string }[]; manufacturers: string[] };

export function PartsToolbar({ cats, manufacturers }: Props) {
  const { get, set } = useUrlFilters();
  const [q, setQ] = useDebouncedParam("q");
  const hasFilter = !!(get("q") || get("cat") || get("mfr") || get("status"));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-steel" />
        <Input
          id="parts-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="코드 · 부품명 · 호환기종 검색"
          className="bg-card pl-8"
          aria-label="부품 검색"
        />
      </div>
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
      <Select value={get("mfr") || "all"} onValueChange={(v) => set({ mfr: v })}>
        <SelectTrigger className="w-[150px] bg-card" aria-label="제조사">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 제조사</SelectItem>
          {manufacturers.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={get("status") || "all"} onValueChange={(v) => set({ status: v })}>
        <SelectTrigger className="w-[130px] bg-card" aria-label="운영상태">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 상태</SelectItem>
          {Object.entries(PART_STATUS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); set({ q: null, cat: null, mfr: null, status: null }); }}>
          <X /> 초기화
        </Button>
      )}
    </div>
  );
}
