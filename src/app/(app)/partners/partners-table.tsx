"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { BookOpenText, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/page-header";
import { useActionToast } from "@/hooks/use-action-toast";
import { krw, num } from "@/lib/format";
import { PARTNER_TYPE } from "@/lib/dates";
import { ConfirmButton } from "@/components/confirm-button";
import { deletePartner, savePartner } from "./actions";

export type PartnerRow = {
  id: number;
  code: string;
  name: string;
  type: "dealer" | "service_center" | "direct_store" | "online_mall" | "other";
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  memo: string | null;
  isActive: boolean;
  orderCount: number;
  totalAmount: number;
  lastDate: string | null;
};

export function PartnersTable({ rows }: { rows: PartnerRow[] }) {
  const [editing, setEditing] = useState<PartnerRow | null>(null);
  return (
    <>
      <Table className="text-[13px]">
        <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
          <TableRow className="hover:bg-transparent">
            <TableHead className="th-label w-[90px]">코드</TableHead>
            <TableHead className="th-label">거래처명</TableHead>
            <TableHead className="th-label w-[110px]">유형</TableHead>
            <TableHead className="th-label">담당자 / 연락처</TableHead>
            <TableHead className="th-label">소재지</TableHead>
            <TableHead className="th-label w-[90px] text-right">출고건수</TableHead>
            <TableHead className="th-label w-[130px] text-right">누적 거래금액</TableHead>
            <TableHead className="th-label w-[110px]">최근 거래일</TableHead>
            <TableHead className="w-[112px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="p-0">
                <EmptyState title="거래처가 없습니다" hint="오른쪽 위 '거래처 등록' 으로 추가하세요." />
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id} className={r.isActive ? "" : "text-steel"}>
              <TableCell className="code">{r.code}</TableCell>
              <TableCell className="font-medium">
                {r.name}
                {!r.isActive && <Badge variant="secondary" className="ml-2">거래 중지</Badge>}
              </TableCell>
              <TableCell><Badge variant="outline">{PARTNER_TYPE[r.type]}</Badge></TableCell>
              <TableCell>
                {r.contactName ?? "—"}
                {r.phone && <span className="ml-1.5 text-steel">{r.phone}</span>}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-steel">{r.address ?? "—"}</TableCell>
              <TableCell className="tabular text-right">{num(r.orderCount)}</TableCell>
              <TableCell className="tabular text-right font-medium">{krw(r.totalAmount)}</TableCell>
              <TableCell className="tabular text-steel">{r.lastDate ?? "—"}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="ghost" size="icon-sm" asChild title="거래처 원장">
                  <Link href={`/ledger/partners?partner=${r.id}`} aria-label={`${r.name} 원장`}>
                    <BookOpenText />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} aria-label={`${r.name} 수정`} title="수정">
                  <Pencil />
                </Button>
                <ConfirmButton
                  action={deletePartner.bind(null, r.id)}
                  title={`'${r.name}' 삭제`}
                  description={r.orderCount > 0 ? `출고 전표 ${r.orderCount}건이 연결되어 있어 삭제할 수 없습니다. 수정에서 '거래 중' 을 해제하면 목록에서 숨길 수 있습니다.` : "거래처를 지웁니다. 되돌릴 수 없습니다."}
                  confirmLabel="삭제"
                  destructive
                  size="icon-sm"
                  className="text-destructive"
                  label="삭제"
                >
                  <Trash2 />
                </ConfirmButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PartnerDialog open={editing !== null} onClose={() => setEditing(null)} row={editing} />
    </>
  );
}

function PartnerDialog({ open, onClose, row }: { open: boolean; onClose: () => void; row: PartnerRow | null }) {
  const [state, action, pending] = useActionState(savePartner, undefined);
  useActionToast(state, onClose);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? `${row.code} 수정` : "거래처 등록"}</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4" key={row?.id ?? "new"}>
          {row && <input type="hidden" name="id" value={row.id} />}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pt-name">거래처명</Label>
              <Input id="pt-name" name="name" defaultValue={row?.name ?? ""} required autoFocus maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-type">유형</Label>
              <Select name="type" defaultValue={row?.type ?? "dealer"}>
                <SelectTrigger id="pt-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PARTNER_TYPE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-contact">담당자</Label>
              <Input id="pt-contact" name="contactName" defaultValue={row?.contactName ?? ""} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-phone">연락처</Label>
              <Input id="pt-phone" name="phone" defaultValue={row?.phone ?? ""} maxLength={30} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt-email">이메일</Label>
              <Input id="pt-email" name="email" type="email" defaultValue={row?.email ?? ""} maxLength={100} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pt-address">사업장 소재지</Label>
              <Input id="pt-address" name="address" defaultValue={row?.address ?? ""} maxLength={200} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pt-memo">메모</Label>
              <Textarea id="pt-memo" name="memo" defaultValue={row?.memo ?? ""} rows={2} maxLength={500} />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox name="isActive" value="true" defaultChecked={row?.isActive ?? true} /> 거래 중 (출고 등록 목록에 표시)
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewPartnerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus /> 거래처 등록
      </Button>
      <PartnerDialog open={open} onClose={() => setOpen(false)} row={null} />
    </>
  );
}
