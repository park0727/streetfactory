"use client";
/**
 * 엑셀 생성·파싱은 브라우저에서만 한다 (Workers CPU 제한). exceljs 는 동적 import 로 지연 로드.
 */
export type XlsxColumn = { header: string; key: string; width?: number; numFmt?: string };

async function loadExcelJS() {
  const mod = await import("exceljs");
  return (mod.default ?? mod) as typeof import("exceljs");
}

/** rows 를 xlsx 로 만들어 다운로드한다. */
export async function downloadXlsx(opts: { filename: string; sheetName?: string; columns: XlsxColumn[]; rows: Record<string, unknown>[] }) {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts.sheetName ?? "Sheet1", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = opts.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 14 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8ECF4" } };
  for (const r of opts.rows) ws.addRow(r);
  opts.columns.forEach((c, i) => {
    if (c.numFmt) ws.getColumn(i + 1).numFmt = c.numFmt;
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 첫 시트를 읽어 헤더 행 기준의 객체 배열로 돌려준다. 값은 전부 문자열로 정규화. */
export async function readXlsx(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cellText(cell.value)).trim();
  });

  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowNo) => {
    if (rowNo === 1) return;
    const obj: Record<string, string> = {};
    let empty = true;
    headers.forEach((h, i) => {
      if (!h) return;
      const v = cellText(row.getCell(i + 1).value);
      if (v !== "") empty = false;
      obj[h] = v;
    });
    if (!empty) rows.push(obj);
  });
  return { headers: headers.filter(Boolean), rows };
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as { richText?: { text: string }[]; result?: unknown; text?: string; hyperlink?: string };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.result !== undefined) return cellText(o.result);
    if (o.text !== undefined) return String(o.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
}
