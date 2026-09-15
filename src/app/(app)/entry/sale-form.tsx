"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/combobox";
import { krw, pct, num } from "@/lib/format";
import { PartPicker, StockHint, } from "./part-picker";
import { createSale, type PartHit } from "./actions";

type Line = { key: number; part: PartHit | null; qty: number; unitPrice: number };
type Props = { partners: { id: number; name: string; type: string; code: string }[]; channels: string[]; isAdmin: boolean; today: string };

const PARTNER_TYPE: Record<string, string> = { dealer: "대리점", service_center: "정비센터", direct_store: "직영", online_mall: "온라인", other: "기타" };
let keySeq = 1;
const newLine = (): Line => ({ key: keySeq++, part: null, qty: 1, unitPrice: 0 });

export function SaleForm({ partners, channels, isAdmin, today }: Props) {
  const router = useRouter();
  const [docDate, setDocDate] = useState(today);
  const [partnerId, setPartnerId] = useState("");
  const [channel, setChannel] = useState(channels[0] ?? "");
  const [memo, setMemo] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [pending, start] = useTransition();

  const totals = useMemo(() => {
    let amount = 0, cost = 0, qty = 0;
    for (const l of lines) {
      if (!l.part) continue;
      amount += l.qty * l.unitPrice;
      cost += l.qty * l.part.avgCost;
      qty += l.qty;
    }
    const profit = amount - cost;
    return { amount, cost, qty, profit, margin: amount > 0 ? (profit / amount) * 100 : 0 };
  }, [lines]);
  const anyShort = lines.some((l) => l.part && l.qty > l.part.qty);

  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function setPart(key: number, p: PartHit) {
    update(key, { part: p, unitPrice: p.retailPrice });
  }

  function submit() {
    const valid = lines.filter((l) => l.part);
    if (!partnerId) return toast.error("거래처를 선택하세요.");
    if (valid.length === 0) return toast.error("부품을 한 개 이상 추가하세요.");
    start(async () => {
      const r = await createSale({
        docDate,
        partnerId: Number(partnerId),
        channel: channel || undefined,
        memo: memo || undefined,
        allowNegative,
        lines: valid.map((l) => ({ partId: l.part!.id, qty: l.qty, unitPrice: l.unitPrice })),
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(r.message);
      setLines([newLine()]);
      setMemo("");
      setAllowNegative(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[130px_1fr_140px]">
        <div className="space-y-1.5">
          <Label htmlFor="s-date">출고일</Label>
          <Input id="s-date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="h-9" />
        </div>
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label htmlFor="s-partner">거래처</Label>
          <Combobox
            id="s-partner"
            value={partnerId}
            onChange={setPartnerId}
            placeholder="거래처 선택"
            searchPlaceholder="거래처명 · 코드 검색"
            options={partners.map((p) => ({ value: String(p.id), label: p.name, hint: PARTNER_TYPE[p.type] ?? p.type, keywords: p.code }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-channel">판매채널</Label>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger id="s-channel" className="h-9 w-full bg-card">
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_84px_120px_120px_36px] gap-2 px-0.5 sm:grid">
          <span className="th-label">부품</span>
          <span className="th-label text-right">수량</span>
          <span className="th-label text-right">단가 (₩)</span>
          <span className="th-label text-right">금액</span>
          <span />
        </div>
        {lines.map((l, i) => (
          <div key={l.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border bg-muted/30 p-2 sm:grid-cols-[1fr_84px_120px_120px_36px] sm:items-start sm:border-0 sm:bg-transparent sm:p-0">
            <div className="col-span-2 space-y-1 sm:col-span-1">
              <PartPicker id={`s-part-${i}`} value={l.part} onChange={(p) => setPart(l.key, p)} autoFocus={i === 0 && lines.length === 1} />
              <StockHint p={l.part} qty={l.qty} />
            </div>
            <div>
              <Label htmlFor={`s-qty-${i}`} className="text-[11px] text-steel sm:hidden">수량</Label>
              <Input id={`s-qty-${i}`} type="number" min={1} step={1} value={l.qty} onChange={(e) => update(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })} className="tabular h-9 text-right" aria-label="수량" />
            </div>
            <div>
              <Label htmlFor={`s-price-${i}`} className="text-[11px] text-steel sm:hidden">단가</Label>
              <Input id={`s-price-${i}`} type="number" min={0} step={1} value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} className="tabular h-9 text-right" aria-label="단가" />
            </div>
            <div className="tabular flex h-9 items-center justify-end text-[13.5px] font-medium">{l.part ? krw(l.qty * l.unitPrice) : "—"}</div>
            <Button type="button" variant="ghost" size="icon-sm" className="text-steel hover:text-status-critical" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [newLine()]))} aria-label="라인 삭제">
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine()])}>
          <Plus /> 부품 추가
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="s-memo">메모</Label>
        <Input id="s-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="비고 (선택)" className="h-9" maxLength={300} />
      </div>

      <div className="rounded-md border bg-muted/40 px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-4">
          <Sum label="총 수량" value={`${num(totals.qty)}개`} />
          <Sum label="총 주문금액" value={krw(totals.amount)} strong />
          <Sum label="예상 매출이익" value={krw(totals.profit)} tone={totals.profit < 0 ? "critical" : undefined} />
          <Sum label="마진율" value={pct(totals.margin)} tone={totals.margin < 0 ? "critical" : undefined} />
        </dl>
        <p className="mt-2 text-[11.5px] text-steel">이익은 현재 평균원가 기준 예상치이며, 저장 시점 원가가 전표에 고정됩니다. 금액은 부가세 별도.</p>
      </div>

      {anyShort && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2 text-[13px] text-status-critical">
          재고보다 많은 수량이 있습니다.{" "}
          {isAdmin ? (
            <label className="ml-1 inline-flex items-center gap-1.5">
              <input type="checkbox" className="accent-primary" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} />
              재고 부족해도 출고 (관리자)
            </label>
          ) : (
            "관리자만 재고 초과 출고를 할 수 있습니다."
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending || (anyShort && !allowNegative)} className="h-10 px-5">
          {pending ? "등록 중…" : "출고 등록"}
        </Button>
      </div>
    </div>
  );
}

function Sum({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "critical" }) {
  return (
    <div className="contents">
      <div className="flex items-baseline justify-between sm:block">
        <dt className="text-steel">{label}</dt>
        <dd className={`tabular ${strong ? "text-[17px] font-semibold" : "font-medium"} ${tone === "critical" ? "text-status-critical" : ""}`}>{value}</dd>
      </div>
    </div>
  );
}
