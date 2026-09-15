"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUrlFilters } from "@/hooks/use-url-filters";

export function PayFilter() {
  const { get, set } = useUrlFilters();
  return (
    <Select value={get("pay") || "all"} onValueChange={(v) => set({ pay: v })}>
      <SelectTrigger className="h-9 w-[130px] bg-card" aria-label="결제 상태">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">결제 전체</SelectItem>
        <SelectItem value="unpaid">미수만</SelectItem>
        <SelectItem value="paid">완납만</SelectItem>
      </SelectContent>
    </Select>
  );
}
