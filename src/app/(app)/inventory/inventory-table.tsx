"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/page-header";
import { StockStatusBadge } from "@/components/status-badge";
import { krw, num } from "@/lib/format";
import type { vInventory } from "@/db/schema";
import { AdjustDialog } from "./adjust-dialog";

export type InvRow = typeof vInventory.$inferSelect;

export function InventoryTable({ rows }: { rows: InvRow[] }) {
  const [target, setTarget] = useState<InvRow | null>(null);
  return (
    <>
      <Table className="text-[13px]">
        <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
          <TableRow className="hover:bg-transparent">
            <TableHead className="th-label w-[120px]">코드</TableHead>
            <TableHead className="th-label">부품명</TableHead>
            <TableHead className="th-label">규격 / 호환기종</TableHead>
            <TableHead className="th-label w-[64px] text-right">기초</TableHead>
            <TableHead className="th-label w-[64px] text-right">입고</TableHead>
            <TableHead className="th-label w-[64px] text-right">판매</TableHead>
            <TableHead className="th-label w-[64px] text-right">조정</TableHead>
            <TableHead className="th-label w-[72px] text-right">현재</TableHead>
            <TableHead className="th-label w-[64px] text-right">안전</TableHead>
            <TableHead className="th-label w-[120px]">상태</TableHead>
            <TableHead className="th-label w-[100px] text-right">평균원가</TableHead>
            <TableHead className="th-label w-[120px] text-right">평가액</TableHead>
            <TableHead className="w-[44px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={13} className="p-0">
                <EmptyState title="조건에 맞는 품목이 없습니다" />
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => {
            const stripe = r.stockStatus === "out" ? "shadow-[inset_3px_0_0_var(--status-critical)]" : r.stockStatus === "low" ? "shadow-[inset_3px_0_0_var(--status-warn)]" : "";
            return (
              <TableRow key={r.id} className={`${stripe} ${r.stockStatus !== "ok" ? "bg-status-warn/[0.035]" : ""}`}>
                <TableCell className="code">{r.code}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="max-w-[220px] truncate text-steel" title={r.spec ?? ""}>{r.spec ?? "—"}</TableCell>
                <TableCell className="tabular text-right text-steel">{num(r.openingQty)}</TableCell>
                <TableCell className="tabular text-right text-steel">{num(r.inboundQty)}</TableCell>
                <TableCell className="tabular text-right text-steel">{num(r.soldQty)}</TableCell>
                <TableCell className="tabular text-right text-steel">{r.adjustmentQty === 0 ? "—" : (r.adjustmentQty > 0 ? "+" : "") + num(r.adjustmentQty)}</TableCell>
                <TableCell className={`tabular text-right font-semibold ${r.stockStatus === "out" ? "text-status-critical" : r.stockStatus === "low" ? "text-status-warn" : ""}`}>{num(r.qty)}</TableCell>
                <TableCell className="tabular text-right text-steel">{num(r.safetyStock)}</TableCell>
                <TableCell><StockStatusBadge status={r.stockStatus} /></TableCell>
                <TableCell className="tabular text-right">{krw(r.avgCost)}</TableCell>
                <TableCell className="tabular text-right">{krw(r.stockValue)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => setTarget(r)} aria-label={`${r.code} 실사 조정`} title="실사 조정">
                    <SlidersHorizontal />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <AdjustDialog row={target} onClose={() => setTarget(null)} />
    </>
  );
}
