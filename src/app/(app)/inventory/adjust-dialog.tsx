"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import { num } from "@/lib/format";
import { adjustStock } from "./actions";
import type { InvRow } from "./inventory-table";

export function AdjustDialog({ row, onClose }: { row: InvRow | null; onClose: () => void }) {
  const [state, action, pending] = useActionState(adjustStock, undefined);
  useActionToast(state, onClose);
  const [actual, setActual] = useState<string>("");
  const diff = row && actual !== "" ? Number(actual) - row.qty : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={row !== null} onOpenChange={(o) => { if (!o) { onClose(); setActual(""); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>실사 조정</DialogTitle>
          <DialogDescription>
            {row && (
              <>
                <span className="code">{row.code}</span> {row.name} · 현재 장부재고 <b className="tabular">{num(row.qty)}</b>개
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {row && (
          <form action={action} className="space-y-4" key={row.id}>
            <input type="hidden" name="partId" value={row.id} />
            <div className="space-y-1.5">
              <Label htmlFor="adj-qty">실제 수량 (실사 결과)</Label>
              <Input id="adj-qty" name="actualQty" type="number" min={0} step={1} required autoFocus value={actual} onChange={(e) => setActual(e.target.value)} className="tabular text-right text-base" />
              {diff !== null && (
                <p className={`text-[13px] ${diff === 0 ? "text-steel" : diff > 0 ? "text-status-ok" : "text-status-critical"}`}>
                  {diff === 0 ? "차이 없음" : `${diff > 0 ? "+" : ""}${num(diff)}개 조정이 기록됩니다.`}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-date">조정일</Label>
              <Input id="adj-date" name="occurredAt" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-memo">사유</Label>
              <Input id="adj-memo" name="memo" placeholder="예: 분기 실사, 파손 폐기, 입력 누락" required maxLength={200} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>취소</Button>
              <Button type="submit" disabled={pending || diff === 0 || diff === null}>
                {pending ? "저장 중…" : "조정 저장"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
