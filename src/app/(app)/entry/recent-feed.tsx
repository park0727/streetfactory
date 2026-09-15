import Link from "next/link";
import { krw, num } from "@/lib/format";
import type { RecentFeed } from "./actions";

function timeAgo(d: Date, now: number) {
  const s = Math.max(0, (now - d.getTime()) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

export function RecentFeedPanel({ feed, now }: { feed: RecentFeed; now: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FeedList
        now={now}
        title="최근 출고"
        amountLabel="매출액"
        href="/ledger/sales"
        empty="아직 출고 기록이 없습니다."
        rows={feed.sales.map((s) => ({ id: s.id, docNo: s.docNo, date: s.docDate, who: s.partner, lines: s.lines, amount: Number(s.amount), createdAt: s.createdAt, href: `/ledger/sales/${s.id}` }))}
      />
      <FeedList
        now={now}
        title="최근 입고"
        amountLabel="총 입고비용"
        href="/ledger/inbound"
        empty="아직 입고 기록이 없습니다."
        rows={feed.inbound.map((s) => ({ id: s.id, docNo: s.docNo, date: s.docDate, who: s.supplier, lines: s.lines, amount: Number(s.cost), createdAt: s.createdAt, href: `/ledger/inbound/${s.id}` }))}
      />
    </div>
  );
}

function FeedList({ title, href, rows, empty, now, amountLabel }: { now: number; amountLabel: string; title: string; href: string; empty: string; rows: { id: number; docNo: string; date: string; who: string; lines: number; amount: number; createdAt: Date; href: string }[] }) {
  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-[13px] font-semibold">
          {title} <span className="ml-1 font-normal text-steel">전표일자 순 · {amountLabel} (공급가액)</span>
        </p>
        <Link href={href} className="text-[12px] text-steel hover:text-foreground hover:underline">
          원장 전체 보기
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-steel">{empty}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-4 py-2.5 text-[13px] hover:bg-muted/50 sm:flex sm:items-center">
                <span className="code min-w-0 truncate text-[12.5px] sm:w-[128px] sm:shrink-0">{r.docNo}</span>
                <span className="tabular shrink-0 font-medium sm:order-5">{krw(r.amount)}</span>
                <span className="min-w-0 truncate text-steel sm:flex-1 sm:text-foreground">
                  <span className="tabular mr-2 sm:mr-3 sm:inline-block sm:w-[84px] sm:text-steel">{r.date}</span>
                  {r.who}
                </span>
                <span className="shrink-0 text-right text-[11.5px] text-steel sm:order-6 sm:w-[56px]">{timeAgo(r.createdAt, now)}</span>
                <span className="hidden shrink-0 text-steel sm:order-4 sm:inline">{num(r.lines)}개 품목</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
