"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";
import { PART_STATUS } from "@/lib/parts-shared";
import { savePart } from "./actions";

export type PartRow = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  spec: string | null;
  manufacturer: string | null;
  country: string | null;
  supplierId: number | null;
  standardCost: number;
  retailPrice: number;
  avgCost: number;
  safetyStock: number;
  status: "active" | "paused" | "discontinued";
  memo: string | null;
};
export type Cat = { id: number; name: string };
export type Sup = { id: number; name: string; country: string };

type Props = { open: boolean; onClose: () => void; part: PartRow | null; cats: Cat[]; sups: Sup[] };

export function PartDialog({ open, onClose, part, cats, sups }: Props) {
  const [state, action, pending] = useActionState(savePart, undefined);
  useActionToast(state, onClose);
  const isNew = !part;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "부품 등록" : `${part.code} 수정`}</DialogTitle>
          <DialogDescription>
            {isNew ? "부품코드는 등록 후 바꿀 수 없습니다. 기초재고를 넣으면 재고이동에 기록됩니다." : "코드를 제외한 기준정보를 수정합니다. 과거 거래의 단가·원가는 바뀌지 않습니다."}
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5" key={part?.id ?? "new"}>
          {part && <input type="hidden" name="id" value={part.id} />}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-6">
            <Field label="부품코드" htmlFor="p-code" className="sm:col-span-2">
              {isNew ? (
                <Input id="p-code" name="code" placeholder="BRK-0001" required className="code uppercase" autoFocus maxLength={40} />
              ) : (
                <>
                  <Input id="p-code" value={part.code} disabled className="code" />
                  <input type="hidden" name="code" value={part.code} />
                </>
              )}
            </Field>
            <Field label="부품명" htmlFor="p-name" className="sm:col-span-4">
              <Input id="p-name" name="name" defaultValue={part?.name ?? ""} required maxLength={120} autoFocus={!isNew} />
            </Field>
            <Field label="카테고리" htmlFor="p-cat" className="sm:col-span-2">
              <Select name="categoryId" defaultValue={part ? String(part.categoryId) : undefined} required>
                <SelectTrigger id="p-cat" className="w-full">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {cats.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="규격 / 호환기종" htmlFor="p-spec" className="sm:col-span-4">
              <Input id="p-spec" name="spec" defaultValue={part?.spec ?? ""} placeholder="Honda CBR600RR 07-12" maxLength={200} />
            </Field>
            <Field label="제조사" htmlFor="p-mfr" className="sm:col-span-2">
              <Input id="p-mfr" name="manufacturer" defaultValue={part?.manufacturer ?? ""} maxLength={80} />
            </Field>
            <Field label="주요 수입국" htmlFor="p-country" className="sm:col-span-2">
              <Input id="p-country" name="country" defaultValue={part?.country ?? ""} maxLength={40} />
            </Field>
            <Field label="기본 공급사" htmlFor="p-sup" className="sm:col-span-2">
              <Select name="supplierId" defaultValue={part?.supplierId ? String(part.supplierId) : "none"}>
                <SelectTrigger id="p-sup" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {sups.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} · {s.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="표준수입원가 (₩)" htmlFor="p-cost" className="sm:col-span-2">
              <Input id="p-cost" name="standardCost" type="number" min={0} step={1} defaultValue={part?.standardCost ?? ""} className="tabular text-right" />
            </Field>
            <Field label="권장소비자가 (₩)" htmlFor="p-price" className="sm:col-span-2">
              <Input id="p-price" name="retailPrice" type="number" min={0} step={1} defaultValue={part?.retailPrice ?? ""} className="tabular text-right" />
            </Field>
            <Field label="안전재고" htmlFor="p-safety" className="sm:col-span-1">
              <Input id="p-safety" name="safetyStock" type="number" min={0} step={1} defaultValue={part?.safetyStock ?? 0} className="tabular text-right" />
            </Field>
            <Field label="운영상태" htmlFor="p-status" className="sm:col-span-1">
              <Select name="status" defaultValue={part?.status ?? "active"}>
                <SelectTrigger id="p-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PART_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {isNew && (
              <>
                <Field label="기초재고 수량" htmlFor="p-oq" className="sm:col-span-2" hint="지금 창고에 있는 수량">
                  <Input id="p-oq" name="openingQty" type="number" min={0} step={1} defaultValue={0} className="tabular text-right" />
                </Field>
                <Field label="기초재고 단가 (₩)" htmlFor="p-oc" className="sm:col-span-2" hint="비우면 표준원가로">
                  <Input id="p-oc" name="openingUnitCost" type="number" min={0} step={1} className="tabular text-right" />
                </Field>
              </>
            )}
            <Field label="메모" htmlFor="p-memo" className="sm:col-span-6">
              <Textarea id="p-memo" name="memo" defaultValue={part?.memo ?? ""} rows={2} maxLength={500} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "저장 중…" : isNew ? "등록" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, hint, className = "", children }: { label: string; htmlFor: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={htmlFor} className="text-[12.5px]">
        {label}
        {hint && <span className="ml-1 font-normal text-steel">· {hint}</span>}
      </Label>
      {children}
    </div>
  );
}
