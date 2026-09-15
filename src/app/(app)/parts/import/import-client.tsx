"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, FileDown, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Panel } from "@/components/page-header";
import { downloadXlsx, readXlsx } from "@/lib/excel";
import { PART_COLUMNS, EXAMPLE_ROW, type ImportRow, type ValidateResult } from "./columns";
import { validatePartsImport, commitPartsImport } from "./actions";

type Step = "pick" | "preview" | "done";

export function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [pending, start] = useTransition();
  const [onlyErrors, setOnlyErrors] = useState(false);

  async function template() {
    await downloadXlsx({ filename: "부품마스터_템플릿.xlsx", sheetName: "부품마스터", columns: PART_COLUMNS, rows: [EXAMPLE_ROW] });
  }

  async function onFile(file: File) {
    setFileName(file.name);
    try {
      const { headers, rows } = await readXlsx(file);
      const required = PART_COLUMNS.filter((c) => c.required).map((c) => c.header);
      const missing = required.filter((h) => !headers.includes(h));
      if (missing.length) {
        toast.error(`필수 열이 없습니다: ${missing.join(", ")}. 템플릿을 내려받아 사용하세요.`);
        return;
      }
      if (rows.length === 0) {
        toast.error("데이터 행이 없습니다. 2행부터 입력하세요.");
        return;
      }
      setRows(rows);
      start(async () => {
        const r = await validatePartsImport(rows);
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        setResult(r.data);
        setOnlyErrors(r.data.errors > 0);
        setStep("preview");
      });
    } catch {
      toast.error("파일을 읽지 못했습니다. .xlsx 형식인지 확인하세요.");
    }
  }

  function commit() {
    start(async () => {
      const r = await commitPartsImport(rows);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(r.message);
      setStep("done");
    });
  }

  function reset() {
    setStep("pick");
    setRows([]);
    setResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (step === "done") {
    return (
      <Panel className="p-10 text-center">
        <CheckCircle2 className="mx-auto size-10 text-status-ok" strokeWidth={1.5} />
        <p className="mt-3 text-base font-medium">저장했습니다</p>
        <p className="mt-1 text-sm text-steel">
          신규 {result?.inserts}건, 수정 {result?.updates}건이 부품 마스터에 반영되었습니다.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>다른 파일 올리기</Button>
          <Button asChild>
            <Link href="/parts">부품 마스터로</Link>
          </Button>
        </div>
      </Panel>
    );
  }

  if (step === "preview" && result) {
    const shown = onlyErrors ? result.rows.filter((r) => r.action === "error") : result.rows;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <ArrowLeft /> 다른 파일
          </Button>
          <span className="text-sm text-steel">
            <FileSpreadsheet className="mr-1 inline size-4" />
            {fileName} · {rows.length}행
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="신규 등록" value={result.inserts} />
          <Stat label="수정" value={result.updates} />
          <Stat label="오류" value={result.errors} tone={result.errors ? "critical" : undefined} />
          <Stat label="신규 카테고리·공급사" value={result.newCategories.length + result.newSuppliers.length} />
        </div>

        {(result.newCategories.length > 0 || result.newSuppliers.length > 0) && (
          <p className="text-[13px] text-steel">
            저장 시 함께 생성됩니다 —{" "}
            {result.newCategories.length > 0 && <>카테고리: {result.newCategories.join(", ")} </>}
            {result.newSuppliers.length > 0 && <>공급사: {result.newSuppliers.join(", ")}</>}
          </p>
        )}

        {result.errors > 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2.5 text-sm text-status-critical">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <p>오류 {result.errors}건을 엑셀에서 고친 뒤 다시 올려 주세요. 오류가 있으면 한 건도 저장하지 않습니다.</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-status-ok/30 bg-status-ok/5 px-3 py-2.5 text-sm text-status-ok">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>검증을 통과했습니다. 저장을 누르면 한 번에 반영됩니다.</p>
          </div>
        )}

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} className="accent-primary" />
              오류 행만 보기
            </label>
            <span className="text-[12px] text-steel">{shown.length}행 표시</span>
          </div>
          <div className="max-h-[52svh] overflow-auto">
            <Table className="text-[13px]">
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="th-label w-[60px] text-right">행</TableHead>
                  <TableHead className="th-label w-[130px]">부품코드</TableHead>
                  <TableHead className="th-label w-[90px]">판정</TableHead>
                  <TableHead className="th-label">내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={r.row} className={r.action === "error" ? "bg-status-critical/[0.04]" : ""}>
                    <TableCell className="tabular text-right text-steel">{r.row}</TableCell>
                    <TableCell className="code">{r.code || "—"}</TableCell>
                    <TableCell>
                      {r.action === "insert" && <Badge variant="outline" className="border-status-ok/40 text-status-ok">신규</Badge>}
                      {r.action === "update" && <Badge variant="outline">수정</Badge>}
                      {r.action === "error" && <Badge variant="outline" className="border-status-critical/40 text-status-critical">오류</Badge>}
                    </TableCell>
                    <TableCell>
                      {r.errors.length > 0 ? (
                        <ul className="space-y-0.5 text-status-critical">
                          {r.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      ) : r.notes.length > 0 ? (
                        <span className="text-steel">{r.notes.join(" · ")}</span>
                      ) : (
                        <span className="text-steel">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={reset} disabled={pending}>취소</Button>
          <Button onClick={commit} disabled={pending || result.errors > 0}>
            {pending ? "저장 중…" : `저장 (신규 ${result.inserts} · 수정 ${result.updates})`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Panel
        className="flex min-h-[260px] flex-col items-center justify-center gap-3 border-dashed p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        <Upload className="size-8 text-steel" strokeWidth={1.5} />
        <p className="text-sm font-medium">엑셀 파일을 끌어다 놓거나 선택하세요</p>
        <p className="text-[13px] text-steel">.xlsx · 첫 행은 헤더 · 한 번에 2,000행까지</p>
        <input ref={fileRef} id="parts-file" type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Button onClick={() => fileRef.current?.click()} disabled={pending}>
          {pending ? "검증 중…" : "파일 선택"}
        </Button>
      </Panel>
      <Panel className="p-5">
        <p className="text-sm font-medium">사용 방법</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[13px] text-steel">
          <li>템플릿을 내려받아 2행부터 채웁니다. 예시 행은 지워도 됩니다.</li>
          <li>부품코드가 이미 있으면 그 행은 수정, 없으면 신규 등록입니다.</li>
          <li>카테고리·공급사는 이름으로 적습니다. 없는 이름은 자동 생성됩니다.</li>
          <li>운영상태는 운영중 / 일시품절 / 단종 중 하나입니다.</li>
          <li>기초재고는 신규 부품에만 넣을 수 있습니다.</li>
        </ol>
        <Button variant="outline" size="sm" className="mt-4 w-full" onClick={template}>
          <FileDown /> 템플릿 다운로드
        </Button>
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "critical" }) {
  return (
    <div className={`rounded-md border bg-card px-4 py-3 ${tone === "critical" && value > 0 ? "border-status-critical/40" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-steel">{label}</p>
      <p className={`mt-0.5 text-[22px] font-semibold leading-tight ${tone === "critical" && value > 0 ? "text-status-critical" : ""}`}>{value.toLocaleString()}</p>
    </div>
  );
}
