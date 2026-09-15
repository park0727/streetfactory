"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { addDays, monthStart, todayKST, yearStart } from "@/lib/dates";

/** 기간 필터 (URL from/to). 프리셋 + 직접 입력. */
export function DateRange({ from, to }: { from: string; to: string }) {
  const { set } = useUrlFilters();
  const today = todayKST();
  const presets: [string, string, string][] = [
    ["이번 달", monthStart(today), today],
    ["최근 30일", addDays(today, -29), today],
    ["최근 90일", addDays(today, -89), today],
    ["올해", yearStart(today), today],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input type="date" value={from} onChange={(e) => set({ from: e.target.value })} className="h-9 w-[150px] bg-card" aria-label="시작일" />
      <span className="text-steel">~</span>
      <Input type="date" value={to} onChange={(e) => set({ to: e.target.value })} className="h-9 w-[150px] bg-card" aria-label="종료일" />
      <div className="ml-1 flex flex-wrap gap-1">
        {presets.map(([label, f, t]) => (
          <Button key={label} type="button" variant={from === f && to === t ? "secondary" : "ghost"} size="sm" onClick={() => set({ from: f, to: t })}>
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
