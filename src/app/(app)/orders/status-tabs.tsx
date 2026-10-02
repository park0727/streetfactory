"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlFilters } from "@/hooks/use-url-filters";

export function StatusTabs({ counts }: { counts: Record<string, number> }) {
  const { get, set } = useUrlFilters();
  const cur = get("s") || "pending";
  return (
    <Tabs value={cur} onValueChange={(v) => set({ s: v === "pending" ? null : v })}>
      <TabsList>
        <TabsTrigger value="pending">처리 대기 ({counts.pending ?? 0})</TabsTrigger>
        <TabsTrigger value="shipped">출고 완료</TabsTrigger>
        <TabsTrigger value="cancelled">취소</TabsTrigger>
        <TabsTrigger value="all">전체</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
