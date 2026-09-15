"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const q = new URLSearchParams(sp.toString());
    q.set("page", String(p));
    return `${pathname}?${q.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="tabular">
        {from.toLocaleString()}–{to.toLocaleString()} / 총 {total.toLocaleString()}건
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" asChild disabled={page <= 1}>
          <Link href={href(page - 1)} aria-disabled={page <= 1} className={page <= 1 ? "pointer-events-none opacity-50" : ""}>
            <ChevronLeft />
          </Link>
        </Button>
        <span className="tabular px-2">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon-sm" asChild>
          <Link href={href(page + 1)} aria-disabled={page >= pages} className={page >= pages ? "pointer-events-none opacity-50" : ""}>
            <ChevronRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
