"use client";
import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/page-header";
import { PartStatusBadge } from "@/components/status-badge";
import { krw, num } from "@/lib/format";
import { PartDialog, type PartRow, type Cat, type Sup } from "./part-dialog";

type Props = { rows: (PartRow & { categoryName: string; supplierName: string | null })[]; cats: Cat[]; sups: Sup[] };

export function PartsTable({ rows, cats, sups }: Props) {
  const [editing, setEditing] = useState<PartRow | null>(null);
  return (
    <>
      <Table className="text-[13px]">
        <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
          <TableRow className="hover:bg-transparent">
            <TableHead className="th-label w-[120px]">코드</TableHead>
            <TableHead className="th-label">부품명</TableHead>
            <TableHead className="th-label">규격 / 호환기종</TableHead>
            <TableHead className="th-label w-[100px]">카테고리</TableHead>
            <TableHead className="th-label w-[90px]">제조사</TableHead>
            <TableHead className="th-label w-[110px] text-right">표준원가</TableHead>
            <TableHead className="th-label w-[110px] text-right">소비자가</TableHead>
            <TableHead className="th-label w-[70px] text-right">안전재고</TableHead>
            <TableHead className="th-label w-[90px]">상태</TableHead>
            <TableHead className="w-[44px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="p-0">
                <EmptyState title="조건에 맞는 부품이 없습니다" hint="검색어나 필터를 바꾸거나 새 부품을 등록하세요." />
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id} className={r.status === "discontinued" ? "text-steel" : ""}>
              <TableCell className="code">{r.code}</TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="max-w-[260px] truncate text-steel" title={r.spec ?? ""}>{r.spec ?? "—"}</TableCell>
              <TableCell>{r.categoryName}</TableCell>
              <TableCell>{r.manufacturer ?? "—"}</TableCell>
              <TableCell className="tabular text-right">{krw(r.standardCost)}</TableCell>
              <TableCell className="tabular text-right">{krw(r.retailPrice)}</TableCell>
              <TableCell className="tabular text-right">{num(r.safetyStock)}</TableCell>
              <TableCell><PartStatusBadge status={r.status} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label={`${r.code} 수정`} title="수정">
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PartDialog open={editing !== null} onClose={() => setEditing(null)} part={editing} cats={cats} sups={sups} />
    </>
  );
}

export function NewPartButton({ cats, sups, children }: { cats: Cat[]; sups: Sup[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {children}
      </Button>
      <PartDialog open={open} onClose={() => setOpen(false)} part={null} cats={cats} sups={sups} />
    </>
  );
}
