"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { krw } from "@/lib/format";
import { PayStatusBadge } from "../../../(app)/ledger/sales/[id]/settlement";
import type { PayStatus } from "@/lib/payments-shared";

type Doc = { id: number; docNo: string; docDate: string; total: number; balance: number; payStatus: PayStatus; dueDate: string | null };

export function StatementList({ docs }: { docs: Doc[] }) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const open = (ids: number[]) => window.open(`/shop/statement?ids=${ids.join(",")}`, "_blank");
  return (
    <section className="rounded-md border bg-card">
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <p className="text-[15px] font-semibold">거래 내역 · 거래명세서</p>
        <Button size="sm" variant="outline" className="ml-auto" disabled={sel.size === 0} onClick={() => open([...sel])}>
          <FileText /> 선택 출력{sel.size > 0 && ` (${sel.size})`}
        </Button>
      </header>
      {docs.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-steel">최근 1년간 거래 내역이 없습니다.</p>
      ) : (
        <ul className="divide-y">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
              <input type="checkbox" className="size-4 accent-primary" checked={sel.has(d.id)} onChange={() => toggle(d.id)} aria-label={`${d.docNo} 선택`} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="code text-[12.5px]">{d.docNo}</span>
                  <PayStatusBadge status={d.payStatus} />
                </p>
                <p className="text-[12px] text-steel">
                  {d.docDate}
                  {d.balance > 0 && d.dueDate && ` · 입금 예정일 ${d.dueDate}`}
                </p>
              </div>
              <p className="tabular shrink-0 text-right">
                <span className="block font-medium">{krw(d.total)}</span>
                {d.balance > 0 && <span className="block text-[12px] text-status-critical">미수 {krw(d.balance)}</span>}
              </p>
              <Button size="icon-sm" variant="ghost" onClick={() => open([d.id])} aria-label={`${d.docNo} 거래명세서`} title="거래명세서">
                <FileText />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
