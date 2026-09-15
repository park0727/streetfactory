"use client";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/page-header";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { krw, num, pct } from "@/lib/format";

export type LedgerRow = {
  lineId: number;
  orderId: number;
  docNo: string;
  docDate: string;
  partnerName: string;
  channel: string | null;
  partCode: string;
  partName: string;
  spec: string | null;
  qty: number;
  unitPrice: number;
  unitCost: number;
  amount: number;
  profit: number;
};

function SortHead({ k, label, sort, className = "" }: { k: string; label: string; sort: string; className?: string }) {
  const { set } = useUrlFilters();
  const active = sort.startsWith(k);
  const next = k === "date" ? (sort === "date_desc" ? "date_asc" : "date_desc") : "amount_desc";
  return (
    <TableHead className={`th-label ${className}`}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => set({ sort: next })}>
        {label}
        {active && (sort.endsWith("asc") ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </TableHead>
  );
}

export function LedgerTable({ rows, sort }: { rows: LedgerRow[]; sort: string }) {
  return (
    <Table className="text-[13px]">
      <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
        <TableRow className="hover:bg-transparent">
          <TableHead className="th-label w-[130px]">판매번호</TableHead>
          <SortHead k="date" label="출고일자" sort={sort} className="w-[100px]" />
          <TableHead className="th-label">거래처</TableHead>
          <TableHead className="th-label w-[110px]">부품코드</TableHead>
          <TableHead className="th-label">부품명</TableHead>
          <TableHead className="th-label w-[60px] text-right">수량</TableHead>
          <TableHead className="th-label w-[100px] text-right">출고단가</TableHead>
          <SortHead k="amount" label="매출액" sort={sort} className="w-[110px] text-right" />
          <TableHead className="th-label w-[100px] text-right">매출이익</TableHead>
          <TableHead className="th-label w-[70px] text-right">마진</TableHead>
          <TableHead className="th-label w-[80px]">채널</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={11} className="p-0">
              <EmptyState title="해당 기간에 출고 내역이 없습니다" hint="기간을 넓히거나 다른 거래처를 선택하세요." />
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => {
          const m = Number(r.amount) > 0 ? (Number(r.profit) / Number(r.amount)) * 100 : 0;
          return (
            <TableRow key={r.lineId}>
              <TableCell className="code">
                <Link href={`/ledger/sales/${r.orderId}`} className="hover:underline">{r.docNo}</Link>
              </TableCell>
              <TableCell className="tabular">{r.docDate}</TableCell>
              <TableCell className="max-w-[160px] truncate">{r.partnerName}</TableCell>
              <TableCell className="code">{r.partCode}</TableCell>
              <TableCell>
                {r.partName}
                {r.spec && <span className="ml-1.5 text-[12px] text-steel">{r.spec}</span>}
              </TableCell>
              <TableCell className="tabular text-right">{num(r.qty)}</TableCell>
              <TableCell className="tabular text-right">{krw(r.unitPrice)}</TableCell>
              <TableCell className="tabular text-right font-medium">{krw(r.amount)}</TableCell>
              <TableCell className={`tabular text-right ${Number(r.profit) < 0 ? "text-status-critical" : ""}`}>{krw(r.profit)}</TableCell>
              <TableCell className={`tabular text-right ${m < 0 ? "text-status-critical" : "text-steel"}`}>{pct(m)}</TableCell>
              <TableCell className="text-steel">{r.channel ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
