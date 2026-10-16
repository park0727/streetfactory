"use client";
import { useState } from "react";
import { FileDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadXlsx } from "@/lib/excel";

export function LedgerExportButton() {
  const sp = useSearchParams();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/ledger/partners/export?${sp.toString()}`);
      if (!res.ok) throw new Error("데이터를 가져오지 못했습니다.");
      const rows = (await res.json()) as Record<string, unknown>[];
      await downloadXlsx({
        filename: `거래처원장_${sp.get("from") ?? ""}_${sp.get("to") ?? ""}.xlsx`,
        sheetName: "거래처원장",
        columns: [
          { header: "판매번호", key: "docNo", width: 16 },
          { header: "출고일자", key: "docDate", width: 12 },
          { header: "거래처명", key: "partnerName", width: 22 },
          { header: "부품코드", key: "partCode", width: 13 },
          { header: "부품명", key: "partName", width: 26 },
          { header: "규격/호환기종", key: "spec", width: 22 },
          { header: "출고수량", key: "qty", width: 9, numFmt: "0" },
          { header: "출고단가", key: "unitPrice", width: 12, numFmt: "#,##0" },
          { header: "총매출액", key: "amount", width: 13, numFmt: "#,##0" },
          { header: "적용원가", key: "unitCost", width: 12, numFmt: "#,##0" },
          { header: "매출이익", key: "profit", width: 13, numFmt: "#,##0" },
          { header: "판매채널", key: "channel", width: 10 },
        ],
        rows: rows.map((r) => ({ ...r, amount: Number(r.amount), profit: Number(r.profit) })),
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
