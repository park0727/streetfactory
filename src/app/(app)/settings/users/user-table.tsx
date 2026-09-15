"use client";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { useActionToast } from "@/hooks/use-action-toast";
import { createUser, updateUser, setUserActive, resetPassword } from "./actions";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  canParts: boolean;
  canRepair: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
};

type Issued = { email: string; password: string; title: string };

export function UserTable({ rows, meId }: { rows: UserRow[]; meId: string }) {
  const [editing, setEditing] = useState<UserRow | null | "new">(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [pendingReset, startReset] = useTransition();

  const [createState, createAction, creating] = useActionState(createUser, undefined);
  const [updateState, updateAction, updating] = useActionState(updateUser, undefined);
  useActionToast(createState, (s) => {
    setEditing(null);
    setIssued({ ...s.data, title: "계정이 만들어졌습니다" });
  });
  useActionToast(updateState, () => setEditing(null));

  const row = editing === "new" ? null : editing;

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => toast.success("복사했습니다."));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> 사용자 추가
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/60">
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="w-20">역할</TableHead>
              <TableHead>모듈</TableHead>
              <TableHead className="w-28">상태</TableHead>
              <TableHead className="w-36" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className={r.isActive ? "" : "text-muted-foreground"}>
                <TableCell className="font-medium">
                  {r.name}
                  {r.id === meId && <span className="ml-1 text-xs text-muted-foreground">(나)</span>}
                </TableCell>
                <TableCell className="text-sm">{r.email}</TableCell>
                <TableCell>{r.role === "admin" ? <Badge>관리자</Badge> : <Badge variant="outline">직원</Badge>}</TableCell>
                <TableCell className="space-x-1">
                  {r.canParts && <Badge variant="secondary">부품·재고</Badge>}
                  {r.canRepair && <Badge variant="secondary">정비</Badge>}
                  {!r.canParts && !r.canRepair && r.role !== "admin" && <span className="text-xs text-muted-foreground">없음</span>}
                </TableCell>
                <TableCell>
                  {!r.isActive ? (
                    <Badge variant="destructive">비활성</Badge>
                  ) : r.mustChangePassword ? (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">임시 비번</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">정상</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon-sm" title="수정" onClick={() => setEditing(r)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="비밀번호 초기화"
                    disabled={pendingReset || !r.isActive}
                    onClick={() =>
                      startReset(async () => {
                        const res = await resetPassword(r.id);
                        if (res.ok) setIssued({ email: r.email, password: res.data.password, title: "임시 비밀번호를 발급했습니다" });
                        else toast.error(res.error);
                      })
                    }
                  >
                    <KeyRound />
                  </Button>
                  {r.id !== meId &&
                    (r.isActive ? (
                      <ConfirmButton
                        action={setUserActive.bind(null, r.id, false)}
                        title={`'${r.name}' 비활성화`}
                        description="즉시 로그인이 차단됩니다. 기록은 남고 나중에 다시 활성화할 수 있습니다."
                        confirmLabel="비활성화"
                        destructive
                        size="icon-sm"
                        className="text-destructive"
                        label="비활성화"
                      >
                        <UserX />
                      </ConfirmButton>
                    ) : (
                      <ConfirmButton
                        action={setUserActive.bind(null, r.id, true)}
                        title={`'${r.name}' 활성화`}
                        description="다시 로그인할 수 있게 됩니다."
                        confirmLabel="활성화"
                        size="icon-sm"
                        label="활성화"
                      >
                        <UserCheck />
                      </ConfirmButton>
                    ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 추가 / 수정 */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{row ? "사용자 수정" : "사용자 추가"}</DialogTitle>
            {!row && <DialogDescription>임시 비밀번호가 자동 발급됩니다. 생성 후 화면에 한 번만 표시되니 직원에게 전달하세요.</DialogDescription>}
          </DialogHeader>
          <form action={row ? updateAction : createAction} className="space-y-4" key={row?.id ?? "new"}>
            {row && <input type="hidden" name="id" value={row.id} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u-name">이름</Label>
                <Input id="u-name" name="name" defaultValue={row?.name ?? ""} required autoFocus maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-email">이메일</Label>
                <Input id="u-email" name="email" type="email" defaultValue={row?.email ?? ""} required disabled={!!row} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-role">역할</Label>
                <Select name="role" defaultValue={row?.role ?? "staff"} disabled={row?.id === meId}>
                  <SelectTrigger id="u-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">직원</SelectItem>
                    <SelectItem value="admin">관리자</SelectItem>
                  </SelectContent>
                </Select>
                {row?.id === meId && <input type="hidden" name="role" value="admin" />}
              </div>
              <div className="space-y-2">
                <Label>접근 모듈</Label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="canParts" value="true" defaultChecked={row?.canParts ?? true} /> 부품·재고·판매
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox name="canRepair" value="true" defaultChecked={row?.canRepair ?? false} /> 정비 (2차)
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">관리자는 모듈 설정과 무관하게 모든 화면에 접근합니다.</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                취소
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {creating || updating ? "저장 중…" : row ? "저장" : "계정 만들기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 임시 비밀번호 표시 */}
      <Dialog open={issued !== null} onOpenChange={(o) => !o && setIssued(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{issued?.title}</DialogTitle>
            <DialogDescription>이 창을 닫으면 다시 볼 수 없습니다. 직원은 첫 로그인 후 비밀번호를 바꿔야 합니다.</DialogDescription>
          </DialogHeader>
          {issued && (
            <div className="space-y-2 rounded-md bg-muted p-3 font-mono text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{issued.email}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => copy(issued.email)}>
                  <Copy />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold tracking-wider">{issued.password}</span>
                <Button variant="ghost" size="icon-xs" onClick={() => copy(issued.password)}>
                  <Copy />
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIssued(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
