"use client";
import { useActionState, useState, useTransition } from "react";
import { Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmButton } from "@/components/confirm-button";
import { useActionToast } from "@/hooks/use-action-toast";
import { krw } from "@/lib/format";
import { PAYMENT_METHOD, PAY_STATUS, type PaymentMethod, type PayStatus } from "@/lib/payments-shared";
import { savePayment, deletePayment, setTaxInvoice } from "../payments-actions";

export type PaymentRow = { id: number; paidAt: string; amount: number; method: PaymentMethod; memo: string | null; createdByName: string | null };
type Props = {
  orderId: number;
  docNo: string;
  amountSupply: number;
  amountTotal: number;
  vatApplied: boolean;
  paid: number;
  balance: number;
  payStatus: PayStatus;
  dueDate: string | null;
  taxInvoiceIssued: boolean;
  taxInvoiceDate: string | null;
  payments: PaymentRow[];
  today: string;
};

export function PayStatusBadge({ status }: { status: PayStatus }) {
  const cls = status === "paid" ? "border-status-ok/40 bg-status-ok/5 text-status-ok" : status === "partial" ? "border-status-warn/40 bg-status-warn/5 text-status-warn" : "border-status-critical/40 bg-status-critical/5 text-status-critical";
  return (
    <Badge variant="outline" className={cls}>
      {PAY_STATUS[status]}
    </Badge>
  );
}

export function SettlementPanel(p: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<PaymentRow | null | "new">(null);
  const [pending, start] = useTransition();
  const [state, action, saving] = useActionState(savePayment, undefined);
  useActionToast(state, () => setEditing(null));
  const row = editing === "new" ? null : editing;
  const overdue = p.balance > 0 && p.dueDate && p.dueDate < p.today;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="th-label">결제</p>
          <PayStatusBadge status={p.payStatus} />
        </div>
        <dl className="space-y-1.5 text-[13px]">
          <Row k="공급가액" v={krw(p.amountSupply)} />
          <Row k={p.vatApplied ? "받을 금액 (부가세 포함)" : "받을 금액 (부가세 없음)"} v={krw(p.amountTotal)} strong />
          <Row k="수금 합계" v={krw(p.paid)} />
          <Row k="미수 잔액" v={krw(p.balance)} strong tone={p.balance > 0 ? "critical" : undefined} />
          {p.dueDate && <Row k="결제 예정일" v={p.dueDate} tone={overdue ? "critical" : undefined} />}
        </dl>
        {overdue && <p className="mt-2 text-[12px] text-status-critical">결제 예정일이 지났습니다.</p>}
        {p.balance > 0 && (
          <Button size="sm" className="mt-3 w-full" onClick={() => setEditing("new")}>
            <Plus /> 수금 등록
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card p-4">
        <p className="th-label mb-2">세금계산서</p>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            className="accent-primary"
            checked={p.taxInvoiceIssued}
            disabled={pending}
            onChange={(e) =>
              start(async () => {
                const r = await setTaxInvoice(p.orderId, e.target.checked);
                if (r.ok) {
                  toast.success(r.message);
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          />
          발행 완료{p.taxInvoiceIssued && p.taxInvoiceDate && <span className="text-steel">· {p.taxInvoiceDate}</span>}
        </label>
        {!p.vatApplied && <p className="mt-1.5 text-[12px] text-steel">이 전표는 부가세 별도 청구가 꺼져 있습니다.</p>}
      </div>

      <div className="rounded-md border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <ReceiptText className="size-4 text-primary" />
          <p className="text-[13px] font-semibold">수금 내역</p>
        </div>
        {p.payments.length === 0 ? (
          <p className="px-4 py-5 text-center text-[13px] text-steel">아직 수금 기록이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {p.payments.map((pm) => (
              <li key={pm.id} className="flex items-center gap-2 px-4 py-2 text-[13px]">
                <span className="tabular w-[84px] shrink-0 text-steel">{pm.paidAt}</span>
                <span className="w-[64px] shrink-0">{PAYMENT_METHOD[pm.method]}</span>
                <span className="min-w-0 flex-1 truncate text-steel">{pm.memo ?? ""}</span>
                <span className="tabular shrink-0 font-medium">{krw(pm.amount)}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => setEditing(pm)} aria-label="수금 수정" title="수정">
                  <Pencil />
                </Button>
                <ConfirmButton action={deletePayment.bind(null, pm.id)} title="수금 내역 삭제" description={`${pm.paidAt} ${krw(pm.amount)} 수금 기록을 지웁니다. 그만큼 미수 잔액이 늘어납니다.`} confirmLabel="삭제" destructive size="icon-xs" className="text-steel hover:text-status-critical" label="수금 삭제">
                  <Trash2 />
                </ConfirmButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{row ? "수금 수정" : "수금 등록"}</DialogTitle>
            <DialogDescription>
              {p.docNo} · 미수 잔액 {krw(p.balance + (row?.amount ?? 0))}
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4" key={row?.id ?? "new"}>
            <input type="hidden" name="orderId" value={p.orderId} />
            {row && <input type="hidden" name="id" value={row.id} />}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">입금일</Label>
                <Input id="pay-date" name="paidAt" type="date" defaultValue={row?.paidAt ?? p.today} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-method">결제수단</Label>
                <Select name="method" defaultValue={row?.method ?? "transfer"}>
                  <SelectTrigger id="pay-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="pay-amount">금액 (₩)</Label>
                <Input id="pay-amount" name="amount" type="number" min={1} step={1} defaultValue={row?.amount ?? p.balance} required autoFocus className="tabular text-right text-base" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="pay-memo">메모</Label>
                <Input id="pay-memo" name="memo" defaultValue={row?.memo ?? ""} placeholder="입금자명, 비고 (선택)" maxLength={200} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>취소</Button>
              <Button type="submit" disabled={saving}>{saving ? "저장 중…" : "저장"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v, strong, tone }: { k: string; v: string; strong?: boolean; tone?: "critical" }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-steel">{k}</dt>
      <dd className={`tabular text-right ${strong ? "font-semibold" : ""} ${tone === "critical" ? "text-status-critical" : ""}`}>{v}</dd>
    </div>
  );
}
