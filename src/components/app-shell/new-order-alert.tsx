"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, UserPlus } from "lucide-react";

/** 처리 안 한 온라인 주문·거래처 가입 신청이 있으면 모든 관리자 화면 위에 빨간 알림 줄. 1분마다 새로 확인한다. */
export function NewOrderAlert({ count, signups = 0 }: { count: number; signups?: number }) {
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
    const total = count + signups;
    document.title = total > 0 ? `(${total}) ${base}` : base;
  }, [count, signups, pathname]);

  const showOrders = count > 0 && !pathname.startsWith("/orders");
  const showSignups = signups > 0 && !pathname.startsWith("/partners/applications");
  if (!showOrders && !showSignups) return null;
  return (
    <div className="mb-4 space-y-2">
      {showOrders && <Bar href="/orders" icon={<ShoppingBag className="size-4 text-status-critical" />} text={`새 온라인 주문 ${count}건이 있습니다`} />}
      {showSignups && <Bar href="/partners/applications" icon={<UserPlus className="size-4 text-status-critical" />} text={`거래처 가입 신청 ${signups}건이 있습니다`} action="승인하러 가기 →" />}
    </div>
  );
}

function Bar({ href, icon, text, action = "확인하기 →" }: { href: string; icon: React.ReactNode; text: string; action?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-md border border-status-critical/30 bg-status-critical/5 px-4 py-2.5 text-[13.5px] hover:bg-status-critical/10">
      <span className="flex size-6 items-center justify-center rounded-full bg-status-critical text-[11px] font-bold text-white">N</span>
      {icon}
      <span className="font-medium text-status-critical">{text}</span>
      <span className="ml-auto shrink-0 text-[12.5px] font-medium text-status-critical">{action}</span>
    </Link>
  );
}
