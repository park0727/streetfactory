"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "@/components/confirm-button";
import { Panel, EmptyState } from "@/components/page-header";
import { krw } from "@/lib/format";
import type { RuleTier } from "@/lib/pricing";
import { deleteRule, listTargetParts, saveRule, setRuleActive } from "./actions";

type Opt = { id: number; name: string };
export type RuleRow = {
  id: number;
  name: string;
  active: boolean;
  categoryId: number | null;
  brandId: number | null;
  categoryName: string | null;
  brandName: string | null;
  baseRate: number;
  tiers: RuleTier[];
  qtyBasis: "total" | "line";
  pickMode: "target" | "picked";
  listed: number[];
};

export function RulesClient({ rules, cats, brands }: { rules: RuleRow[]; cats: Opt[]; brands: Opt[] }) {
  const [editing, setEditing] = useState<RuleRow | "new" | null>(null);
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> 할인 규칙 추가
        </Button>
      </div>
      {rules.length === 0 ? (
        <Panel>
          <EmptyState title="할인 규칙이 없습니다" hint="예: 타이어 항상 5% 할인, 같은 타이어 4개 이상 사면 10% 할인" />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rules.map((r) => (
            <RuleCard key={r.id} r={r} onEdit={() => setEditing(r)} />
          ))}
        </div>
      )}
      {editing && <RuleDialog key={editing === "new" ? "new" : editing.id} rule={editing === "new" ? null : editing} cats={cats} brands={brands} onClose={() => setEditing(null)} />}
    </>
  );
}

function RuleCard({ r, onEdit }: { r: RuleRow; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const target = r.pickMode === "picked" ? `직접 고른 상품 ${r.listed.length}개` : [r.categoryName ?? "모든 카테고리", r.brandName].filter(Boolean).join(" · ");
  const ex = 100000;
  return (
    <Panel className={`p-4 ${r.active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{r.name}</p>
          <p className="text-[12.5px] text-steel">대상: {target}</p>
        </div>
        <Switch
          checked={r.active}
          disabled={pending}
          aria-label={`${r.name} 사용`}
          onCheckedChange={(v) =>
            start(async () => {
              const res = await setRuleActive(r.id, v);
              if (res.ok) {
                toast.success(res.message);
                router.refresh();
              } else toast.error(res.error);
            })
          }
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {r.baseRate > 0 && <Badge className="bg-status-critical text-white">항상 {r.baseRate}%</Badge>}
        {r.tiers.map((t) => (
          <Badge key={t.minQty} variant="outline" className="border-status-critical/40 text-status-critical">
            {r.qtyBasis === "total" ? "합계" : "같은 상품"} {t.minQty}개↑ {t.rate}%
          </Badge>
        ))}
        {r.pickMode === "target" && r.listed.length > 0 && <Badge variant="secondary">제외 {r.listed.length}개</Badge>}
      </div>
      <p className="mt-2 text-[12px] text-steel">
        예) {krw(ex)} 상품 → {krw(Math.round(ex * (1 - r.baseRate / 100)))}
        {r.tiers[0] && `, ${r.qtyBasis === "total" ? "대상 상품을 합쳐" : "같은 상품"} ${r.tiers[0].minQty}개 이상이면 개당 ${krw(Math.round(ex * (1 - r.tiers[0].rate / 100)))}`}
      </p>
      <div className="mt-3 flex justify-end gap-1">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> 수정
        </Button>
        <ConfirmButton action={deleteRule.bind(null, r.id)} title={`'${r.name}' 삭제`} description="이 할인 규칙을 지웁니다. 이미 받은 주문의 가격은 바뀌지 않습니다." confirmLabel="삭제" destructive variant="outline" size="sm" className="text-status-critical">
          <Trash2 /> 삭제
        </ConfirmButton>
      </div>
    </Panel>
  );
}

type TargetPart = Awaited<ReturnType<typeof listTargetParts>>[number];

function RuleDialog({ rule, cats, brands, onClose }: { rule: RuleRow | null; cats: Opt[]; brands: Opt[]; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(rule?.name ?? "타이어 할인");
  const [active, setActive] = useState(rule?.active ?? true);
  const [categoryId, setCategoryId] = useState<number | null>(rule?.categoryId ?? (cats.find((c) => c.name.includes("타이어"))?.id ?? null));
  const [brandId, setBrandId] = useState<number | null>(rule?.brandId ?? null);
  const [baseRate, setBaseRate] = useState(rule?.baseRate ?? 5);
  const [tiers, setTiers] = useState<RuleTier[]>(rule?.tiers?.length ? rule.tiers : [{ minQty: 4, rate: 10 }]);
  const [qtyBasis, setQtyBasis] = useState<"total" | "line">(rule?.qtyBasis ?? "total");
  const [pickMode, setPickMode] = useState<"target" | "picked">(rule?.pickMode ?? "target");
  const [excluded, setExcluded] = useState<Set<number>>(new Set(rule?.listed ?? []));
  const [partsList, setPartsList] = useState<TargetPart[] | null>(null);
  const [q, setQ] = useState("");
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();

  // 직접 고르기에서는 카테고리·브랜드가 목록을 좁히는 필터 역할만 한다
  useEffect(() => {
    startLoad(async () => setPartsList(await listTargetParts(categoryId, brandId)));
  }, [categoryId, brandId]);
  const picked = pickMode === "picked";

  const shownParts = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (partsList ?? []).filter((p) => !t || `${p.tireSize ?? ""} ${p.name} ${p.code} ${p.brandName ?? ""}`.toLowerCase().includes(t));
  }, [partsList, q]);

  const toggle = (id: number) => setExcluded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? "할인 규칙 수정" : "할인 규칙 추가"}</DialogTitle>
          <DialogDescription>모든 거래처에 공통으로 적용됩니다. 거래처 할인율이 더 크면 거래처 할인율이 적용됩니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="dr-name">규칙 이름</Label>
            <Input id="dr-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>할인할 상품</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice on={!picked} onClick={() => { setPickMode("target"); setExcluded(new Set()); }} title="카테고리·브랜드 전체" desc="새로 등록하는 상품도 자동 포함. 일부만 뺄 수 있음" />
              <Choice on={picked} onClick={() => { setPickMode("picked"); setExcluded(new Set()); }} title="직접 고른 상품만" desc="아래 목록에서 체크한 상품만 할인" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dr-cat">{picked ? "목록 좁히기: 카테고리" : "대상 카테고리"}</Label>
            <Select value={categoryId ? String(categoryId) : "all"} onValueChange={(v) => setCategoryId(v === "all" ? null : Number(v))}>
              <SelectTrigger id="dr-cat" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 카테고리</SelectItem>
                {cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dr-brand">{picked ? "목록 좁히기: 브랜드" : "대상 브랜드"}</Label>
            <Select value={brandId ? String(brandId) : "all"} onValueChange={(v) => setBrandId(v === "all" ? null : Number(v))}>
              <SelectTrigger id="dr-brand" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 브랜드</SelectItem>
                {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dr-base">항상 할인 (%)</Label>
            <Input id="dr-base" type="number" min={0} max={90} step={0.5} value={baseRate} onChange={(e) => setBaseRate(Number(e.target.value) || 0)} className="tabular text-right" />
            <p className="text-[11.5px] text-steel">수량과 상관없이 늘 적용. 없으면 0.</p>
          </div>
          <div className="space-y-1.5">
            <Label>수량 할인</Label>
            <div className="mb-1 grid grid-cols-2 gap-1.5">
              <Choice small on={qtyBasis === "total"} onClick={() => setQtyBasis("total")} title="대상 상품 합계" desc="여러 상품 합쳐서 셈" />
              <Choice small on={qtyBasis === "line"} onClick={() => setQtyBasis("line")} title="같은 상품 하나" desc="한 상품 수량만 셈" />
            </div>
            <div className="space-y-1.5">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[13px]">
                  <Input type="number" min={2} value={t.minQty} onChange={(e) => setTiers((ts) => ts.map((x, j) => (j === i ? { ...x, minQty: Number(e.target.value) || 2 } : x)))} className="tabular h-8 w-16 text-right" aria-label="최소 수량" />
                  <span>개 이상</span>
                  <Input type="number" min={0} max={90} step={0.5} value={t.rate} onChange={(e) => setTiers((ts) => ts.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) || 0 } : x)))} className="tabular h-8 w-16 text-right" aria-label="할인율" />
                  <span>%</span>
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))} aria-label="단계 삭제"><X /></Button>
                </div>
              ))}
              {tiers.length < 6 && (
                <Button type="button" variant="outline" size="xs" onClick={() => setTiers((ts) => [...ts, { minQty: (ts.at(-1)?.minQty ?? 2) + 2, rate: (ts.at(-1)?.rate ?? baseRate) + 2 }])}>
                  <Plus /> 단계 추가
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label>{picked ? "할인할 상품 고르기" : "할인에서 뺄 상품 (특정 사이즈 제외)"}</Label>
              <span className="text-[12px] text-steel">{picked ? `${excluded.size}개 고름` : `${excluded.size}개 제외됨`}</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-steel" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="사이즈 · 이름 · 코드로 찾기" className="pl-8" />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border">
              {loading && !partsList ? (
                <p className="p-3 text-[13px] text-steel">불러오는 중…</p>
              ) : shownParts.length === 0 ? (
                <p className="p-3 text-[13px] text-steel">대상 상품이 없습니다.</p>
              ) : (
                <ul className="divide-y">
                  {shownParts.map((p) => (
                    <li key={p.id}>
                      <label className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px] ${excluded.has(p.id) ? (picked ? "bg-status-ok/5" : "bg-status-critical/5") : ""}`}>
                        <input type="checkbox" className={`size-4 ${picked ? "accent-[var(--status-ok)]" : "accent-[var(--status-critical)]"}`} checked={excluded.has(p.id)} onChange={() => toggle(p.id)} />
                        {p.tireSize && <span className="tabular font-semibold">{p.tireSize}</span>}
                        <span className="min-w-0 flex-1 truncate">{p.name}{p.brandName && <span className="ml-1 text-steel">{p.brandName}</span>}</span>
                        <span className="code text-[11.5px] text-steel">{p.code}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-[11.5px] text-steel">
              {picked ? "체크한 상품만 할인됩니다. 새 상품은 여기서 직접 체크해야 할인 대상이 됩니다." : "체크한 상품은 이 규칙의 할인을 받지 않습니다. 나중에 새 사이즈를 등록하면 자동으로 할인 대상이 됩니다."}
              {picked && excluded.size > 0 && (
                <Button type="button" variant="link" size="xs" className="ml-1 h-auto p-0" onClick={() => setExcluded(new Set())}>
                  모두 해제
                </Button>
              )}
              {picked && (
                <Button type="button" variant="link" size="xs" className="ml-2 h-auto p-0" onClick={() => setExcluded((s0) => new Set([...s0, ...shownParts.map((p) => p.id)]))}>
                  보이는 목록 모두 고르기
                </Button>
              )}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={active} onCheckedChange={setActive} /> 이 규칙 사용
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button
            disabled={saving}
            onClick={() =>
              startSave(async () => {
                const r = await saveRule({ id: rule?.id, name, active, categoryId, brandId, baseRate, tiers: tiers.filter((t) => t.rate > 0), qtyBasis, pickMode, listed: [...excluded] });
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message);
                onClose();
                router.refresh();
              })
            }
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Choice({ on, onClick, title, desc, small }: { on: boolean; onClick: () => void; title: string; desc: string; small?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-md border text-left transition-colors ${small ? "px-2 py-1.5" : "px-3 py-2"} ${on ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}>
      <span className={`block font-medium ${small ? "text-[12.5px]" : "text-[13.5px]"}`}>{title}</span>
      <span className="block text-[11.5px] text-steel">{desc}</span>
    </button>
  );
}
