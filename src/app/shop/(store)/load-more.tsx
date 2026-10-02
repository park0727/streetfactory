"use client";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/use-url-filters";

export function LoadMore({ next }: { next: number }) {
  const { set } = useUrlFilters();
  return (
    <Button variant="outline" className="h-11 w-full" onClick={() => set({ n: String(next) }, { keepPage: true })}>
      상품 더 보기
    </Button>
  );
}
