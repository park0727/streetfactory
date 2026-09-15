"use client";
import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadXlsx } from "@/lib/excel";
import { PART_STATUS, STOCK_STATUS, type PartStatus, type StockStatus } from "@/lib/parts-shared";

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/inventory/export");
      if (!res.ok) throw new Error("데이터를 가져오지 못했습니다.");
      const rows = (await res.json()) as Record<string, unknown>[];
      await downloadXlsx({
        filename: `재고현황_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: "재고현황",
        columns: [
          { header: "부품코드", key: "code", width: 14 },
          { header: "부품명", key: "name", width: 28 },
          { header: "규격/호환기종", key: "spec", width: 24 },
          { header: "카테고리", key: "categoryName", width: 12 },
          { header: "제조사", key: "manufacturer", width: 12 },
          { header: "기초재고", key: "openingQty", width: 9, numFmt: "0" },
          { header: "총입고", key: "inboundQty", width: 9, numFmt: "0" },
          { header: "총판매", key: "soldQty", width: 9, numFmt: "0" },
          { header: "조정", key: "adjustmentQty", width: 8, numFmt: "0" },
          { header: "현재재고", key: "qty", width: 9, numFmt: "0" },
          { header: "안전재고", key: "safetyStock", width: 9, numFmt: "0" },
          { header: "재고상태", key: "stockStatus", width: 12 },
          { header: "운영상태", key: "status", width: 10 },
          { header: "평균원가", key: "avgCost", width: 12, numFmt: "#,##0" },
          { header: "재고평가액", key: "stockValue", width: 14, numFmt: "#,##0" },
        ],
        rows: rows.map((r) => ({ ...r, stockStatus: STOCK_STATUS[r.stockStatus as StockStatus], status: PART_STATUS[r.status as PartStatus] })),
      });
      toast.success(`${rows.length}건을 내려받았습니다.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "엑셀 생성 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="outline" size="sm" onClick={run} disabled={busy}>
      <FileDown /> {busy ? "생성 중…" : "엑셀 다운로드"}
    </Button>
  );
}
