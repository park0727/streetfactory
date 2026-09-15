"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, FileDown, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/combobox";
import { Panel } from "@/components/page-header";
import { downloadXlsx, readXlsx } from "@/lib/excel";
import { krw, num } from "@/lib/format";
import { createInbound } from "../../../entry/actions";
import { CURRENCIES, SHIPPING } from "../../../entry/schema";
import { validateInboundRows, type InboundImportRow } from "../actions";

const COLS = [
  { header: "부품코드", key: "code", width: 14 },
  { header: "수량", key: "qty", width: 8, numFmt: "0" },
  { header: "외화단가", key: "unitPriceFx", width: 12, numFmt: "#,##0.0000" },
];

export function InboundImportClient({ suppliers, today }: { suppliers: { id: number; name: string; country: string }[]; today: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docDate, setDocDate] = useState(today);
  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState("JPY");
  const [rate, setRate] = useState(0);
  const [duty, setDuty] = useState(0);
  const [extra, setExtra] = useState(0);
  const [shipping, setShipping] = useState<string>(SHIPPING[0]);
  const [customs, setCustoms] = useState<"pending" | "cleared">("cleared");
  const [memo, setMemo] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<InboundImportRow[] | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const supplier = suppliers.find((s) => String(s.id) === supplierId);

  const calc = useMemo(() => {
    if (!rows) return null;
    const ok = rows.filter((r) => !r.error);
    const qty = ok.reduce((a, r) => a + r.qty, 0);
    const goods = ok.reduce((a, r) => a + r.qty * r.unitPriceFx * rate, 0);
    return { qty, goods, total: goods + duty + extra, errors: rows.length - ok.length, ok: ok.length };
  }, [rows, rate, duty, extra]);

  async function template() {
    await downloadXlsx({ filename: "입고전표_템플릿.xlsx", sheetName: "입고", columns: COLS, rows: [{ code: "BRK-0001", qty: 10, unitPriceFx: 4200 }] });
  }

  async function onFile(file: File) {
    setFileName(file.name);
    try {
      const { headers, rows: raw } = await readXlsx(file);
      const missing = COLS.map((c) => c.header).filter((h) => !headers.includes(h));
      if (missing.length) {
        toast.error(`필수 열이 없습니다: ${missing.join(", ")}`);
        return;
      }
      start(async () => {
        const r = await validateInboundRows(raw.map((x, i) => ({ row: i + 2, code: x["부품코드"] ?? "", qty: x["수량"] ?? "", unitPriceFx: x["외화단가"] ?? "" })));
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        setRows(r.data);
      });
    } catch {
      toast.error("파일을 읽지 못했습니다. .xlsx 형식인지 확인하세요.");
    }
  }

  function commit() {
    if (!rows || !calc || calc.errors > 0) return;
    if (!supplierId) return toast.error("공급사를 선택하세요.");
    if (!(rate > 0)) return toast.error("환율을 입력하세요.");
    start(async () => {
      const r = await createInbound({
        docDate,
        supplierId: Number(supplierId),
        country: supplier?.country,
        currency,
        exchangeRate: rate,
        dutyAmount: duty,
        extraCost: extra,
        shippingMethod: shipping,
        customsStatus: customs,
        memo: memo || undefined,
        lines: rows.map((x) => ({ partId: x.partId!, qty: x.qty, unitPriceFx: x.unitPriceFx })),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(r.message);
      setDone(r.data.docNo);
    });
  }

  if (done) {
    return (
      <Panel className="p-10 text-center">
        <CheckCircle2 className="mx-auto size-10 text-status-ok" strokeWidth={1.5} />
        <p className="mt-3 text-base font-medium">{done} 입고를 확정했습니다</p>
        <p className="mt-1 text-sm text-steel">재고와 평균원가가 갱신되었습니다.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => { setDone(null); setRows(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}>다른 파일 올리기</Button>
          <Button asChild>
            <Link href="/ledger/inbound">입고 원장으로</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <p className="th-label mb-3">전표 공통 항목</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <div className="space-y-1.5">
            <Label htmlFor="ii-date">입고일</Label>
            <Input id="ii-date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="h-9" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="ii-supplier">공급사</Label>
            <Combobox id="ii-supplier" value={supplierId} onChange={setSupplierId} placeholder="공급사 선택" options={suppliers.map((s) => ({ value: String(s.id), label: s.name, hint: s.country }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ii-cur">통화</Label>
            <Select value={currency} onValueChange={(v) => { setCurrency(v); if (v === "KRW") setRate(1); }}>
              <SelectTrigger id="ii-cur" className="h-9 w-full bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ii-rate">환율</Label>
            <Input id="ii-rate" type="number" min={0} step="0.0001" value={rate || ""} onChange={(e) => setRate(Number(e.target.value) || 0)} className="tabular h-9 text-right" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ii-duty">관세 (₩)</Label>
            <Input id="ii-duty" type="number" min={0} value={duty || ""} onChange={(e) => setDuty(Number(e.target.value) || 0)} className="tabular h-9 text-right" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ii-extra">부대비용 (₩)</Label>
            <Input id="ii-extra" type="number" min={0} value={extra || ""} onChange={(e) => setExtra(Number(e.target.value) || 0)} className="tabular h-9 text-right" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ii-ship">운송</Label>
            <Select value={shipping} onValueChange={setShipping}>
              <SelectTrigger id="ii-ship" className="h-9 w-full bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>{SHIPPING.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ii-customs">통관</Label>
            <Select value={customs} onValueChange={(v) => setCustoms(v as "pending" | "cleared")}>
              <SelectTrigger id="ii-customs" className="h-9 w-full bg-card"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="cleared">통관 완료</SelectItem><SelectItem value="pending">통관 대기</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5 sm:col-span-4 lg:col-span-7">
            <Label htmlFor="ii-memo">메모</Label>
            <Input id="ii-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="송장번호 등 (선택)" className="h-9" />
          </div>
        </div>
      </Panel>

      {!rows ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Panel className="flex min-h-[200px] flex-col items-center justify-center gap-3 border-dashed p-8 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}>
            <Upload className="size-8 text-steel" strokeWidth={1.5} />
            <p className="text-sm font-medium">부품 라인 엑셀을 올리세요</p>
            <p className="text-[13px] text-steel">열: 부품코드 · 수량 · 외화단가 · 최대 500행</p>
            <input ref={fileRef} id="inbound-file" type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Button onClick={() => fileRef.current?.click()} disabled={pending}>{pending ? "검증 중…" : "파일 선택"}</Button>
          </Panel>
          <Panel className="p-5">
            <p className="text-sm font-medium">사용 방법</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] text-steel">
              <li>위에서 입고일·공급사·통화·환율·관세·부대비용을 입력합니다.</li>
              <li>템플릿에 부품코드, 수량, 외화단가를 채웁니다.</li>
              <li>부품코드는 마스터에 등록된 것만 가능합니다.</li>
              <li>저장하면 전표 1건이 생기고 평균원가가 갱신됩니다.</li>
            </ol>
            <Button variant="outline" size="sm" className="mt-4 w-full" onClick={template}><FileDown /> 템플릿 다운로드</Button>
          </Panel>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-steel">
            <FileSpreadsheet className="size-4" /> {fileName} · {rows.length}행
            <Button variant="ghost" size="sm" onClick={() => { setRows(null); if (fileRef.current) fileRef.current.value = ""; }}>다른 파일</Button>
          </div>
          {calc && calc.errors > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2.5 text-sm text-status-critical"><CircleAlert className="mt-0.5 size-4 shrink-0" />오류 {calc.errors}행을 고친 뒤 다시 올려 주세요. 오류가 있으면 저장하지 않습니다.</div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-status-ok/30 bg-status-ok/5 px-3 py-2.5 text-sm text-status-ok"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />부품코드 검증을 통과했습니다.</div>
          )}
          <Panel className="overflow-hidden">
            <div className="max-h-[48svh] overflow-auto">
              <Table className="text-[13px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="th-label w-[50px] text-right">행</TableHead>
                    <TableHead className="th-label w-[120px]">부품코드</TableHead>
                    <TableHead className="th-label">부품명 / 오류</TableHead>
                    <TableHead className="th-label w-[70px] text-right">수량</TableHead>
                    <TableHead className="th-label w-[110px] text-right">단가 ({currency})</TableHead>
                    <TableHead className="th-label w-[110px] text-right">원화단가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.row} className={r.error ? "bg-status-critical/[0.04]" : ""}>
                      <TableCell className="tabular text-right text-steel">{r.row}</TableCell>
                      <TableCell className="code">{r.code || "—"}</TableCell>
                      <TableCell className={r.error ? "text-status-critical" : ""}>{r.error ?? r.name}</TableCell>
                      <TableCell className="tabular text-right">{r.error ? "" : num(r.qty)}</TableCell>
                      <TableCell className="tabular text-right">{r.error ? "" : num(r.unitPriceFx, 2)}</TableCell>
                      <TableCell className="tabular text-right">{r.error ? "" : krw(Math.round(r.unitPriceFx * rate))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
          {calc && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 px-4 py-3 text-[13px]">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>총 수량 <b className="tabular">{num(calc.qty)}</b>개</span>
                <span>물품대 <b className="tabular">{krw(Math.round(calc.goods))}</b></span>
                <span>관세+부대 <b className="tabular">{krw(duty + extra)}</b></span>
                <span>총 입고비용 <b className="tabular text-[15px]">{krw(Math.round(calc.total))}</b></span>
              </div>
              <Button onClick={commit} disabled={pending || calc.errors > 0}>{pending ? "확정 중…" : `입고 확정 (${calc.ok}행)`}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
