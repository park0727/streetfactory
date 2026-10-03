"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";

/** 처리 안 한 온라인 주문이 있으면 모든 관리자 화면 위에 빨간 알림 줄. 1분마다 새로 확인한다. */
export function NewOrderAlert({ count }: { count: number }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [router]);

  // 브라우저 탭 제목 앞에 (N) 표시
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = count > 0 ? `(${count}) ${base}` : base;
  }, [count, pathname]);

  if (count === 0 || pathname.startsWith("/orders")) return null;
  return (
    <Link href="/orders" className="mb-4 flex items-center gap-3 rounded-md border border-status-critical/30 bg-status-critical/5 px-4 py-2.5 text-[13.5px] hover:bg-status-critical/10">
      <span className="flex size-6 items-center justify-center rounded-full bg-status-critical text-[11px] font-bold text-white">N</span>
      <ShoppingBag className="size-4 text-status-critical" />
      <span className="font-medium text-status-critical">새 온라인 주문 {count}건이 있습니다</span>
      <span className="ml-auto text-[12.5px] font-medium text-status-critical">확인하기 →</span>
    </Link>
  );
}
