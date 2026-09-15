"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/combobox";
import { krw, num } from "@/lib/format";
import { PartPicker } from "./part-picker";
import { createInbound, updateInbound, type PartHit } from "./actions";
import { CURRENCIES, SHIPPING } from "./schema";

type Line = { key: number; part: PartHit | null; qty: number; unitPriceFx: number };
export type InboundInitial = {
  orderId: number;
  docNo: string;
  docDate: string;
  supplierId: number | null;
  currency: string;
  exchangeRate: number;
  dutyAmount: number;
  extraCost: number;
  shippingMethod: string | null;
  customsStatus: "pending" | "cleared";
  memo: string | null;
  lines: { part: PartHit; qty: number; unitPriceFx: number }[];
};
type Props = { suppliers: { id: number; name: string; country: string }[]; today: string; initial?: InboundInitial; onSaved?: (docNo: string) => void };
let keySeq = 1;
const newLine = (): Line => ({ key: keySeq++, part: null, qty: 1, unitPriceFx: 0 });

const DEFAULT_CURRENCY: Record<string, string> = { 일본: "JPY", 미국: "USD", 영국: "GBP", 중국: "CNY", 독일: "EUR", 이탈리아: "EUR", 대만: "TWD", 태국: "THB" };

export function InboundForm({ suppliers, today, initial, onSaved }: Props) {
  const router = useRouter();
  const editing = !!initial;
  const [docDate, setDocDate] = useState(initial?.docDate ?? today);
  const [supplierId, setSupplierId] = useState(initial?.supplierId ? String(initial.supplierId) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? "JPY");
  const [rate, setRate] = useState<number>(initial?.exchangeRate ?? 0);
  const [duty, setDuty] = useState(initial?.dutyAmount ?? 0);
  const [extra, setExtra] = useState(initial?.extraCost ?? 0);
  const [shipping, setShipping] = useState<string>(initial?.shippingMethod ?? SHIPPING[0]);
  const [customs, setCustoms] = useState<"pending" | "cleared">(initial?.customsStatus ?? "cleared");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [lines, setLines] = useState<Line[]>(initial ? initial.lines.map((l) => ({ ...newLine(), part: l.part, qty: l.qty, unitPriceFx: l.unitPriceFx })) : [newLine()]);
  const [pending, start] = useTransition();

  const supplier = suppliers.find((s) => String(s.id) === supplierId);

  const calc = useMemo(() => {
    const valid = lines.filter((l) => l.part);
    const totalQty = valid.reduce((a, l) => a + l.qty, 0);
    const goods = valid.reduce((a, l) => a + l.qty * l.unitPriceFx * rate, 0);
    const overhead = duty + extra;
    const perLine = new Map<number, { krw: number; landed: number }>();
    for (const l of valid) {
      const krwUnit = l.unitPriceFx * rate;
      const alloc = totalQty > 0 ? (overhead * l.qty) / totalQty : 0;
      perLine.set(l.key, { krw: krwUnit, landed: l.qty > 0 ? (l.qty * krwUnit + alloc) / l.qty : 0 });
    }
    return { totalQty, goods, overhead, total: goods + overhead, perLine };
  }, [lines, rate, duty, extra]);

  function pickSupplier(v: string) {
    setSupplierId(v);
    const s = suppliers.find((x) => String(x.id) === v);
    if (s && DEFAULT_CURRENCY[s.country]) setCurrency(DEFAULT_CURRENCY[s.country]);
  }
  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function submit() {
    const valid = lines.filter((l) => l.part);
    if (!supplierId) return toast.error("공급사를 선택하세요.");
    if (!(rate > 0)) return toast.error("환율을 입력하세요. 원화 거래면 KRW 와 1 을 넣습니다.");
    if (valid.length === 0) return toast.error("부품을 한 개 이상 추가하세요.");
    start(async () => {
      const input = {
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
        lines: valid.map((l) => ({ partId: l.part!.id, qty: l.qty, unitPriceFx: l.unitPriceFx })),
      };
      const r = initial ? await updateInbound(initial.orderId, input) : await createInbound(input);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(r.message);
      if (initial) {
        onSaved?.(r.data.docNo);
        return;
      }
      setLines([newLine()]);
      setDuty(0);
      setExtra(0);
      setMemo("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {suppliers.length === 0 && (
        <p className="rounded-md border border-status-warn/40 bg-status-warn/5 px-3 py-2 text-[13px] text-status-warn">
          등록된 해외 공급사가 없습니다. <Link href="/settings/master" className="font-medium underline">기준 데이터 → 공급사</Link>에서 먼저 등록하세요.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[130px_1fr_110px]">
        <div className="space-y-1.5">
          <Label htmlFor="i-date">통관/입고일</Label>
          <Input id="i-date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="h-9" />
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label htmlFor="i-supplier">해외 공급사</Label>
          <Combobox id="i-supplier" value={supplierId} onChange={pickSupplier} placeholder="공급사 선택" searchPlaceholder="공급사 · 국가 검색" options={suppliers.map((s) => ({ value: String(s.id), label: s.name, hint: s.country, keywords: s.country }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-country">수입국</Label>
          <Input id="i-country" value={supplier?.country ?? ""} readOnly placeholder="자동" className="h-9 bg-muted/50" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="space-y-1.5">
          <Label htmlFor="i-cur">통화</Label>
          <Select value={currency} onValueChange={(v) => { setCurrency(v); if (v === "KRW") setRate(1); }}>
            <SelectTrigger id="i-cur" className="h-9 w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-rate">환율 (₩/{currency})</Label>
          <Input id="i-rate" type="number" min={0} step="0.0001" value={rate || ""} onChange={(e) => setRate(Number(e.target.value) || 0)} placeholder="예: 9.2" className="tabular h-9 text-right" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-duty">관세 (₩)</Label>
          <Input id="i-duty" type="number" min={0} step={1} value={duty || ""} onChange={(e) => setDuty(Number(e.target.value) || 0)} placeholder="0" className="tabular h-9 text-right" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-extra">부대비용 (₩)</Label>
          <Input id="i-extra" type="number" min={0} step={1} value={extra || ""} onChange={(e) => setExtra(Number(e.target.value) || 0)} placeholder="운송·창고" className="tabular h-9 text-right" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-ship">운송방식</Label>
          <Select value={shipping} onValueChange={setShipping}>
            <SelectTrigger id="i-ship" className="h-9 w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIPPING.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="i-customs">통관상태</Label>
          <Select value={customs} onValueChange={(v) => setCustoms(v as "pending" | "cleared")}>
            <SelectTrigger id="i-customs" className="h-9 w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cleared">통관 완료</SelectItem>
              <SelectItem value="pending">통관 대기</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="hidden grid-cols-[minmax(0,1fr)_84px_120px_110px_110px_36px] gap-2 px-0.5 sm:grid">
          <span className="th-label">부품</span>
          <span className="th-label text-right">수량</span>
          <span className="th-label text-right">단가 ({currency})</span>
          <span className="th-label text-right">원화단가</span>
          <span className="th-label text-right">실질원가/개</span>
          <span />
        </div>
        {lines.map((l, i) => {
          const c = calc.perLine.get(l.key);
          return (
            <div key={l.key} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-md border bg-muted/30 p-2 sm:grid-cols-[minmax(0,1fr)_84px_120px_110px_110px_36px] sm:items-start sm:border-0 sm:bg-transparent sm:p-0">
              <div className="col-span-3 min-w-0 sm:col-span-1">
                <PartPicker id={`i-part-${i}`} value={l.part} onChange={(p) => update(l.key, { part: p })} showPrice="cost" />
              </div>
              <div>
                <Label htmlFor={`i-qty-${i}`} className="text-[11px] text-steel sm:hidden">수량</Label>
                <Input id={`i-qty-${i}`} type="number" min={1} step={1} value={l.qty} onChange={(e) => update(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })} className="tabular h-9 text-right" aria-label="수량" />
              </div>
              <div>
                <Label htmlFor={`i-fx-${i}`} className="text-[11px] text-steel sm:hidden">단가 ({currency})</Label>
                <Input id={`i-fx-${i}`} type="number" min={0} step="0.0001" value={l.unitPriceFx || ""} onChange={(e) => update(l.key, { unitPriceFx: Number(e.target.value) || 0 })} className="tabular h-9 text-right" aria-label="외화 단가" />
              </div>
              <div className="tabular flex h-9 items-center justify-end text-[13px] text-steel sm:justify-end">{c ? krw(Math.round(c.krw)) : "—"}</div>
              <div className="tabular flex h-9 items-center justify-end text-[13.5px] font-medium">{c ? krw(Math.round(c.landed)) : "—"}</div>
              <Button type="button" variant="ghost" size="icon-sm" className="text-steel hover:text-status-critical" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [newLine()]))} aria-label="라인 삭제">
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
          <Plus /> 부품 추가
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="i-memo">메모</Label>
        <Input id="i-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="송장번호, 비고 (선택)" className="h-9" maxLength={300} />
      </div>

      <div className="rounded-md border bg-muted/40 px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-4">
          <Sum label="총 수량" value={`${num(calc.totalQty)}개`} />
          <Sum label="물품대 (₩)" value={krw(Math.round(calc.goods))} />
          <Sum label="관세 + 부대비용" value={krw(calc.overhead)} />
          <Sum label="총 입고비용" value={krw(Math.round(calc.total))} strong />
        </dl>
        <p className="mt-2 text-[11.5px] text-steel">부대비용은 라인 수량 비례로 배분되어 개당 실질원가에 반영되고, 확정 시 평균원가가 갱신됩니다.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} className="h-10 px-5">
          {pending ? (editing ? "저장 중…" : "확정 중…") : editing ? "수정 저장 (재확정)" : "입고 확정"}
        </Button>
      </div>
    </div>
  );
}

function Sum({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between sm:block">
      <dt className="text-steel">{label}</dt>
      <dd className={`tabular ${strong ? "text-[17px] font-semibold" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
