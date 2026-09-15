"use client";
import { useActionState, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { useActionToast } from "@/hooks/use-action-toast";
import { saveSupplier, deleteSupplier } from "./actions";

export type SupplierRow = {
  id: number;
  name: string;
  country: string;
  contact: string | null;
  memo: string | null;
  isActive: boolean;
  partCount: number;
};

const COUNTRY_SUGGEST = ["일본", "미국", "독일", "이탈리아", "영국", "중국", "대만", "태국", "베트남", "인도네시아"];

export function SupplierList({ rows }: { rows: SupplierRow[] }) {
  const [editing, setEditing] = useState<SupplierRow | null | "new">(null);
  const [state, action, pending] = useActionState(saveSupplier, undefined);
  useActionToast(state, () => setEditing(null));
  const row = editing === "new" ? null : editing;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> 공급사 추가
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/60">
            <TableRow>
              <TableHead>공급사명</TableHead>
              <TableHead className="w-28">국가</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead className="w-20 text-right">부품 수</TableHead>
              <TableHead className="w-24">상태</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  등록된 공급사가 없습니다.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} className={r.isActive ? "" : "text-muted-foreground"}>
                <TableCell className="font-medium">
                  {r.name}
                  {r.memo && <p className="text-xs font-normal text-muted-foreground">{r.memo}</p>}
                </TableCell>
                <TableCell>{r.country}</TableCell>
                <TableCell className="text-sm">{r.contact ?? "-"}</TableCell>
                <TableCell className="tabular text-right">{r.partCount}</TableCell>
                <TableCell>
                  {r.isActive ? <Badge variant="outline">사용 중</Badge> : <Badge variant="secondary">사용 안 함</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} title="수정">
                    <Pencil />
                  </Button>
                  <ConfirmButton
                    action={deleteSupplier.bind(null, r.id)}
                    title={`'${r.name}' 삭제`}
                    description="이 공급사를 기본 공급사로 둔 부품은 공급사가 비워집니다. 입고 이력이 있으면 삭제되지 않습니다."
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
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{row ? "공급사 수정" : "공급사 추가"}</DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4" key={row?.id ?? "new"}>
            {row && <input type="hidden" name="id" value={row.id} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-name">공급사명</Label>
                <Input id="s-name" name="name" defaultValue={row?.name ?? ""} required autoFocus maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-country">국가</Label>
                <Input id="s-country" name="country" list="country-suggest" defaultValue={row?.country ?? ""} required maxLength={50} />
                <datalist id="country-suggest">
                  {COUNTRY_SUGGEST.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-contact">연락처</Label>
                <Input id="s-contact" name="contact" defaultValue={row?.contact ?? ""} placeholder="담당자, 이메일, 전화" maxLength={200} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-memo">메모</Label>
                <Textarea id="s-memo" name="memo" defaultValue={row?.memo ?? ""} rows={2} maxLength={500} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox name="isActive" value="true" defaultChecked={row?.isActive ?? true} />
                사용 중 (입고 등록 시 선택 목록에 표시)
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                취소
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "저장 중…" : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
