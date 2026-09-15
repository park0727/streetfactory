"use client";
import { useActionState, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/lib/action-result";

export type SimpleRow = { id: number; name: string; sortOrder: number; usage?: number };

type Props = {
  label: string; // "카테고리"
  rows: SimpleRow[];
  usageLabel?: string; // "부품 수"
  save: (prev: unknown, fd: FormData) => Promise<ActionResult>;
  remove: (id: number) => Promise<ActionResult>;
};

export function SimpleList({ label, rows, usageLabel, save, remove }: Props) {
  const [editing, setEditing] = useState<SimpleRow | null | "new">(null);
  const [state, action, pending] = useActionState(save, undefined);
  useActionToast(state, () => setEditing(null));
  const row = editing === "new" ? null : editing;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> {label} 추가
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/60">
            <TableRow>
              <TableHead className="w-16 text-right">순서</TableHead>
              <TableHead>{label}명</TableHead>
              {usageLabel && <TableHead className="w-24 text-right">{usageLabel}</TableHead>}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  등록된 {label}이(가) 없습니다.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="tabular text-right text-muted-foreground">{r.sortOrder}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                {usageLabel && <TableCell className="tabular text-right">{r.usage ?? 0}</TableCell>}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditing(r)} title="수정">
                    <Pencil />
                  </Button>
                  <ConfirmButton
                    action={remove.bind(null, r.id)}
                    title={`'${r.name}' 삭제`}
                    description="삭제하면 되돌릴 수 없습니다."
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{row ? `${label} 수정` : `${label} 추가`}</DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-4" key={row?.id ?? "new"}>
            {row && <input type="hidden" name="id" value={row.id} />}
            <div className="space-y-2">
              <Label htmlFor="name">{label}명</Label>
              <Input id="name" name="name" defaultValue={row?.name ?? ""} required autoFocus maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">정렬 순서</Label>
              <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={row?.sortOrder ?? rows.length + 1} className="tabular" />
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
