"use client";
import { useState } from "react";
import { Printer, Scissors, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bizNo, krw, num } from "@/lib/format";
import type { PrintDoc, Sender } from "./print-sheet";

/** 반 장에 들어가는 품목 줄 수. 넘치면 다음 장으로 이어진다 (2장 구성 유지). */
const LINES_PER_HALF = 12;
const COPIES = ["공급자 보관용", "공급받는자 보관용"] as const;

/**
 * 관리자 출고증: A4 한 장을 위아래로 나눠 같은 내용을 두 번 찍는다 (공급자 보관용 / 공급받는자 보관용).
 * 원가·이익은 절대 싣지 않는다.
 */
export function DuplexSheet({ docs, sender }: { docs: PrintDoc[]; sender?: Sender | null }) {
  const [withPrice, setWithPrice] = useState(false);
  const title = withPrice ? "거래명세서" : "출고증";
  const pages = docs.flatMap((d) => {
    const chunks: PrintDoc["lines"][] = [];
    for (let i = 0; i < Math.max(1, d.lines.length); i += LINES_PER_HALF) chunks.push(d.lines.slice(i, i + LINES_PER_HALF));
    return chunks.map((lines, i) => ({ d, lines, page: i + 1, pages: chunks.length }));
  });

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 7mm 10mm; }
        @media print {
          .no-print { display: none !important; }
          .page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; height: 283mm !important; page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          body { background: #fff !important; }
        }
        .half table { border-collapse: collapse; width: 100%; }
        .half th, .half td { border: 1px solid #222; padding: 3.5px 6px; font-size: 11.5px; line-height: 1.35; vertical-align: middle; }
        .half th { background: #f0f0f0; font-weight: 600; text-align: center; }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-white/95 px-5 py-3 text-sm backdrop-blur">
        <span className="font-semibold">
          {title} {docs.length}건 · A4 {pages.length}장
        </span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="accent-black" checked={withPrice} onChange={(e) => setWithPrice(e.target.checked)} /> 단가·금액 표시 (거래명세서)
        </label>
        <span className="text-xs text-neutral-500">한 장에 위는 공급자용, 아래는 받는 분용이 찍힙니다. 가운데 점선을 잘라 쓰세요.</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={() => window.print()}>
            <Printer /> 인쇄
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.close()}>
            <X /> 닫기
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] space-y-8 px-4 py-6 print:max-w-none print:space-y-0 print:p-0">
        {pages.map((p, idx) => (
          <section key={idx} className="page mx-auto flex h-[297mm] w-[210mm] flex-col bg-white p-[7mm_10mm] shadow-md">
            <Half {...p} sender={sender} withPrice={withPrice} title={title} copy={COPIES[0]} />
            <div className="relative my-[2mm] flex items-center gap-2 text-[10px] text-neutral-400">
              <Scissors className="size-3" />
              <div className="flex-1 border-t border-dashed border-neutral-400" />
              <span>자르는 선</span>
            </div>
            <Half {...p} sender={sender} withPrice={withPrice} title={title} copy={COPIES[1]} />
          </section>
        ))}
      </div>
    </>
  );
}

function Half({ d, lines, page, pages, sender, withPrice, title, copy }: { d: PrintDoc; lines: PrintDoc["lines"]; page: number; pages: number; sender?: Sender | null; withPrice: boolean; title: string; copy: string }) {
  const last = page === pages;
  const supply = d.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const vat = d.vatApplied ? Math.round(supply * 0.1) : 0;
  const qty = d.lines.reduce((a, l) => a + l.qty, 0);
  const cols = withPrice ? 6 : 5;
  return (
    <div className="half flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="mb-2 flex items-end justify-between border-b-2 border-black pb-1.5">
        <div className="flex items-end gap-3">
          <h1 className="text-[20px] leading-none font-bold tracking-tight">{title}</h1>
          <span className="rounded border border-black px-1.5 py-0.5 text-[11px] font-semibold">{copy}</span>
        </div>
        <div className="text-right text-[11px] leading-snug">
          <p>
            전표 <b className="font-mono">{d.docNo}</b> · 출고일 {d.docDate}
          </p>
          {pages > 1 && <p>{page} / {pages} 쪽</p>}
        </div>
      </header>

      <div className="mb-2 grid grid-cols-2 gap-4 text-[11px] leading-snug">
        <div>
          <span className="text-neutral-500">받는 곳 </span>
          <b className="text-[13px]">{d.partnerName}</b>
          {d.bizNo && <span> · {bizNo(d.bizNo)}</span>}
          <p>
            {[d.contactName && `담당 ${d.contactName}`, d.phone].filter(Boolean).join(" · ")}
            {d.address && ` · ${d.address}`}
          </p>
        </div>
        <div>
          <span className="text-neutral-500">보내는 곳 </span>
          <b className="text-[13px]">{sender?.companyName || "라이더매니아"}</b>
          {sender?.bizNo && <span> · {bizNo(sender.bizNo)}</span>}
          <p>{[sender?.ceoName && `대표 ${sender.ceoName}`, sender?.phone, sender?.address].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: 26 }}>#</th>
            <th style={{ width: 96 }}>부품코드</th>
            <th>부품명 / 규격</th>
            <th style={{ width: 46 }}>수량</th>
            {withPrice && <th style={{ width: 84 }}>단가</th>}
            {withPrice && <th style={{ width: 92 }}>금액</th>}
            {!withPrice && <th style={{ width: 64 }}>확인</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.lineNo}>
              <td className="text-center">{l.lineNo}</td>
              <td className="font-mono">{l.code}</td>
              <td className="truncate">
                {l.name}
                {l.spec && <span className="ml-1 text-neutral-500">{l.spec}</span>}
              </td>
              <td className="tabular text-right">{num(l.qty)}</td>
              {withPrice && <td className="tabular text-right">{krw(l.unitPrice)}</td>}
              {withPrice && <td className="tabular text-right">{krw(l.qty * l.unitPrice)}</td>}
              {!withPrice && <td />}
            </tr>
          ))}
          {Array.from({ length: Math.max(0, LINES_PER_HALF - lines.length) }).map((_, i) => (
            <tr key={`e${i}`}>
              {Array.from({ length: cols }).map((__, j) => (
                <td key={j}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
        {last && (
          <tfoot>
            <tr>
              <th colSpan={3} className="text-right">
                합계{withPrice && ` (공급가 ${krw(supply)}${d.vatApplied ? ` + 부가세 ${krw(vat)}` : ""})`}
              </th>
              <th className="tabular text-right">{num(qty)}</th>
              {withPrice && <th />}
              {withPrice && <th className="tabular text-right">{krw(supply + vat)}</th>}
              {!withPrice && <th />}
            </tr>
          </tfoot>
        )}
      </table>

      <div className="mt-auto flex items-end justify-between gap-6 pt-2 text-[11px]">
        <p className="min-w-0 flex-1 truncate">{d.memo ? `비고: ${d.memo}` : ""}</p>
        <div className="flex gap-6">
          <span className="w-28 border-t border-black pt-1">출고 담당 (서명)</span>
          <span className="w-28 border-t border-black pt-1">인수 확인 (서명)</span>
        </div>
      </div>
    </div>
  );
}
