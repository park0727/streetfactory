"use client";
import { useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bizNo, krw, num } from "@/lib/format";

type Line = { lineNo: number; code: string; name: string; spec: string | null; qty: number; unitPrice: number };
export type PrintDoc = {
  id: number;
  docNo: string;
  docDate: string;
  channel: string | null;
  memo: string | null;
  vatApplied: boolean;
  dueDate: string | null;
  partnerName: string;
  partnerCode: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  bizNo: string | null;
  lines: Line[];
};

/**
 * A4 출고증 / 거래명세서. 원가·이익은 절대 싣지 않는다.
 * 기본은 단가 없는 '출고증'(배송 확인용), 체크하면 단가·금액이 들어간 '거래명세서'.
 */
export function PrintSheet({ docs }: { docs: PrintDoc[] }) {
  const [withPrice, setWithPrice] = useState(false);
  const title = withPrice ? "거래명세서" : "출고증";
  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 14mm 12mm; }
        @media print {
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: auto !important; padding: 0 !important; page-break-after: always; }
          .sheet:last-child { page-break-after: auto; }
          body { background: #fff !important; }
        }
        .sheet table { border-collapse: collapse; width: 100%; }
        .sheet th, .sheet td { border: 1px solid #222; padding: 6px 8px; font-size: 12.5px; vertical-align: middle; }
        .sheet th { background: #f0f0f0; font-weight: 600; text-align: center; }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-white/95 px-5 py-3 text-sm backdrop-blur">
        <span className="font-semibold">{title} {docs.length}건</span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="accent-black" checked={withPrice} onChange={(e) => setWithPrice(e.target.checked)} /> 단가·금액 표시 (거래명세서)
        </label>
        <span className="text-xs text-neutral-500">전표당 A4 한 장. 원가와 이익은 인쇄되지 않습니다.</span>
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
        {docs.map((d) => {
          const supply = d.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
          const vat = d.vatApplied ? Math.round(supply * 0.1) : 0;
          const qty = d.lines.reduce((a, l) => a + l.qty, 0);
          return (
            <section key={d.id} className="sheet mx-auto min-h-[297mm] w-[210mm] bg-white p-[14mm_12mm] shadow-md">
              <header className="mb-5 flex items-end justify-between border-b-2 border-black pb-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.2em] text-neutral-500">STREETFACTORY · PARTS &amp; SERVICE</p>
                  <h1 className="mt-1 text-[26px] font-bold tracking-tight">{title}</h1>
                </div>
                <div className="text-right text-[12.5px] leading-relaxed">
                  <p>
                    전표번호 <b className="font-mono">{d.docNo}</b>
                  </p>
                  <p>출고일 {d.docDate}</p>
                  {d.channel && <p>채널 {d.channel}</p>}
                </div>
              </header>

              <div className="mb-4 grid grid-cols-2 gap-6 text-[12.5px]">
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-neutral-500">받는 곳</p>
                  <p className="text-[15px] font-bold">{d.partnerName}</p>
                  {d.bizNo && <p>사업자번호 {bizNo(d.bizNo)}</p>}
                  {d.contactName && <p>담당 {d.contactName}{d.phone && ` · ${d.phone}`}</p>}
                  {!d.contactName && d.phone && <p>{d.phone}</p>}
                  {d.address && <p>{d.address}</p>}
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-neutral-500">보내는 곳</p>
                  <p className="text-[15px] font-bold">Streetfactory</p>
                  <p className="text-neutral-600">오토바이 수리 · 수입 부품</p>
                  {withPrice && d.dueDate && <p className="mt-1">결제 예정일 {d.dueDate}</p>}
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>#</th>
                    <th style={{ width: 110 }}>부품코드</th>
                    <th>부품명 / 규격</th>
                    <th style={{ width: 60 }}>수량</th>
                    {withPrice && <th style={{ width: 100 }}>단가</th>}
                    {withPrice && <th style={{ width: 110 }}>금액</th>}
                    {!withPrice && <th style={{ width: 90 }}>확인</th>}
                  </tr>
                </thead>
                <tbody>
                  {d.lines.map((l) => (
                    <tr key={l.lineNo}>
                      <td className="text-center">{l.lineNo}</td>
                      <td className="font-mono">{l.code}</td>
                      <td>
                        {l.name}
                        {l.spec && <span className="ml-1.5 text-neutral-500">{l.spec}</span>}
                      </td>
                      <td className="text-right tabular">{num(l.qty)}</td>
                      {withPrice && <td className="text-right tabular">{krw(l.unitPrice)}</td>}
                      {withPrice && <td className="text-right tabular">{krw(l.qty * l.unitPrice)}</td>}
                      {!withPrice && <td />}
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 8 - d.lines.length) }).map((_, i) => (
                    <tr key={`e${i}`}>
                      <td>&nbsp;</td>
                      <td />
                      <td />
                      <td />
                      {withPrice && <td />}
                      {withPrice && <td />}
                      {!withPrice && <td />}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} className="text-right">합계</th>
                    <th className="text-right tabular">{num(qty)}</th>
                    {withPrice && <th />}
                    {withPrice && <th className="text-right tabular">{krw(supply)}</th>}
                    {!withPrice && <th />}
                  </tr>
                  {withPrice && (
                    <>
                      <tr>
                        <th colSpan={5} className="text-right">부가세 {d.vatApplied ? "(10%)" : "(없음)"}</th>
                        <th className="text-right tabular">{krw(vat)}</th>
                      </tr>
                      <tr>
                        <th colSpan={5} className="text-right">총액</th>
                        <th className="text-right tabular">{krw(supply + vat)}</th>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>

              {d.memo && <p className="mt-3 text-[12.5px]">비고: {d.memo}</p>}

              <div className="mt-10 grid grid-cols-2 gap-10 text-[12.5px]">
                <div className="border-t border-black pt-2">출고 담당 (서명)</div>
                <div className="border-t border-black pt-2">인수 확인 (서명)</div>
              </div>
              <p className="mt-6 text-center text-[11px] text-neutral-500">이 문서는 Streetfactory 부품 관리 시스템에서 출력되었습니다.</p>
            </section>
          );
        })}
      </div>
    </>
  );
}
