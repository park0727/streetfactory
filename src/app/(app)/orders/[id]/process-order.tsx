"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { krw, num } from "@/lib/format";
import { cancelWebOrder, shipWebOrder } from "../actions";

type Line = { id: number; lineNo: number; code: string; name: string; spec: string | null; qty: number; unitPrice: number; stock: number };

export function ProcessOrder({ orderId, orderNo, pending, vatApplied, today, lines }: { orderId: number; orderNo: string; pending: boolean; vatApplied: boolean; today: string; lines: Line[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<number, number>>(Object.fromEntries(lines.map((l) => [l.id, l.qty])));
  const [docDate, setDocDate] = useState(today);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingShip, startShip] = useTransition();
  const [pendingCancel, startCancel] = useTransition();

  const supply = lines.reduce((a, l) => a + (qty[l.id] ?? 0) * l.unitPrice, 0);
  const total = vatApplied ? Math.round(supply * 1.1) : supply;
  const changed = lines.some((l) => qty[l.id] !== l.qty);
  const short = lines.filter((l) => (qty[l.id] ?? 0) > l.stock);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border bg-card">
        <Table className="text-[13px]">
          <TableHeader className="bg-muted/70">
            <TableRow className="hover:bg-transparent">
              <TableHead className="th-label w-[40px] text-right">#</TableHead>
              <TableHead className="th-label w-[120px]">부품코드</TableHead>
              <TableHead className="th-label">부품명</TableHead>
              <TableHead className="th-label w-[90px] text-right">현재 재고</TableHead>
              <TableHead className="th-label w-[110px] text-right">주문 수량</TableHead>
              <TableHead className="th-label w-[110px] text-right">적용 단가</TableHead>
              <TableHead className="th-label w-[120px] text-right">금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => {
              const q = qty[l.id] ?? 0;
              const over = q > l.stock;
              return (
                <TableRow key={l.id} className={over ? "bg-status-critical/[0.04]" : ""}>
                  <TableCell className="tabular text-right text-steel">{l.lineNo}</TableCell>
                  <TableCell className="code">{l.code}</TableCell>
                  <TableCell>
                    {l.name}
                    {l.spec && <span className="ml-1.5 text-[12px] text-steel">{l.spec}</span>}
                  </TableCell>
                  <TableCell className={`tabular text-right ${over ? "font-medium text-status-critical" : "text-steel"}`}>{num(l.stock)}</TableCell>
                  <TableCell className="text-right">
                    {pending ? (
                      <Input type="number" min={0} value={q} onChange={(e) => setQty((s) => ({ ...s, [l.id]: Math.max(0, Number(e.target.value) || 0) }))} className="tabular ml-auto h-8 w-20 text-right" aria-label={`${l.name} 출고 수량`} />
                    ) : (
                      <span className="tabular">{num(l.qty)}</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular text-right">{krw(l.unitPrice)}</TableCell>
                  <TableCell className="tabular text-right font-medium">{krw(q * l.unitPrice)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t px-4 py-3 text-[13px]">
          <span className="text-steel">공급가 <b className="tabular text-foreground">{krw(supply)}</b></span>
          <span className="text-steel">받을 금액 <b className="tabular text-[15px] text-foreground">{krw(total)}</b> {vatApplied ? "(부가세 포함)" : "(부가세 없음)"}</span>
        </div>
      </div>

      {pending && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="ship-date">출고일</Label>
            <Input id="ship-date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="h-9 w-[160px]" />
          </div>
          <p className="min-w-[220px] flex-1 text-[12.5px] text-steel">
            {changed ? "수량을 바꾼 내용이 주문에도 반영됩니다. 0 으로 두면 그 품목은 빠집니다. " : ""}출고 처리하면 판매 전표가 만들어지고, 입금 전이므로 미수로 잡힙니다.
          </p>
          <Button variant="outline" className="text-status-critical" onClick={() => setCancelOpen(true)} disabled={pendingShip}>
            <XCircle /> 주문 취소
          </Button>
          <Button
            disabled={pendingShip || short.length > 0}
            onClick={() =>
              startShip(async () => {
                const r = await shipWebOrder({ orderId, docDate, lines: lines.map((l) => ({ lineId: l.id, qty: qty[l.id] ?? 0 })) });
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success(r.message);
                router.push(`/ledger/sales/${r.data.salesOrderId}`);
                router.refresh();
              })
            }
          >
            <PackageCheck /> {pendingShip ? "처리 중…" : short.length ? "재고 부족 — 수량 조정 필요" : "출고 처리"}
          </Button>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{orderNo} 주문 취소</DialogTitle>
            <DialogDescription>취소 사유는 거래처 주문 화면에도 보입니다.</DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 품절, 단종, 거래처 요청" autoFocus maxLength={200} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>닫기</Button>
            <Button
              variant="destructive"
              disabled={pendingCancel}
              onClick={() =>
                startCancel(async () => {
                  const r = await cancelWebOrder(orderId, reason);
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success(r.message);
                    setCancelOpen(false);
                    router.refresh();
                  }
                })
              }
            >
              {pendingCancel ? "취소 중…" : "주문 취소"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
