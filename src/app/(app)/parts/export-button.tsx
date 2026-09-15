"use client";
import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadXlsx } from "@/lib/excel";
import { PART_STATUS, type PartStatus } from "@/lib/parts-shared";
import { PART_COLUMNS } from "./import/columns";

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/parts/export");
      if (!res.ok) throw new Error("데이터를 가져오지 못했습니다.");
      const rows = (await res.json()) as Record<string, unknown>[];
      await downloadXlsx({
        filename: `부품마스터_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: "부품마스터",
        columns: [...PART_COLUMNS.filter((c) => !c.importOnly), { header: "평균원가", key: "avgCost", width: 12, numFmt: "#,##0" }],
        rows: rows.map((r) => ({ ...r, status: PART_STATUS[r.status as PartStatus] ?? r.status })),
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
