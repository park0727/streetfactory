"use client";
import { useActionState, useState, useTransition } from "react";
import { Copy, KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmButton } from "@/components/confirm-button";
import { useActionToast } from "@/hooks/use-action-toast";
import { createCustomerAccount, resetCustomerPassword, setCustomerActive } from "./account-actions";

export type AccountRow = { id: string; partnerId: number; name: string; email: string; isActive: boolean; mustChangePassword: boolean };

export function AccountsDialog({ partner, accounts, open, onClose }: { partner: { id: number; name: string }; accounts: AccountRow[]; open: boolean; onClose: () => void }) {
  const [adding, setAdding] = useState(accounts.length === 0);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [state, action, pending] = useActionState(createCustomerAccount, undefined);
  const [resetting, startReset] = useTransition();
  useActionToast(state, (s) => {
    setAdding(false);
    if (s.data.password) setIssued({ email: s.data.email, password: s.data.password });
  });
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success("복사했습니다."));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{partner.name} · 주문 계정</DialogTitle>
          <DialogDescription>이 계정으로 거래처가 휴대폰에서 직접 부품을 주문합니다. 한 거래처에 여러 계정을 만들 수 있습니다.</DialogDescription>
        </DialogHeader>

        {issued && (
          <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-[13px] font-medium">거래처에 아래 정보를 알려 주세요. 이 창을 닫으면 비밀번호는 다시 볼 수 없습니다.</p>
            <div className="space-y-1 font-mono text-sm">
              <p className="flex items-center justify-between gap-2">아이디 {issued.email} <Button size="icon-xs" variant="ghost" onClick={() => copy(issued.email)} aria-label="아이디 복사"><Copy /></Button></p>
              <p className="flex items-center justify-between gap-2">비밀번호 <b className="tracking-wider">{issued.password}</b> <Button size="icon-xs" variant="ghost" onClick={() => copy(issued.password)} aria-label="비밀번호 복사"><Copy /></Button></p>
            </div>
            <p className="text-[12px] text-steel">처음 로그인하면 거래처가 직접 새 비밀번호를 정하게 됩니다.</p>
          </div>
        )}

        {accounts.length > 0 && (
          <ul className="divide-y rounded-md border">
            {accounts.map((a) => (
              <li key={a.id} className={`flex items-center gap-2 px-3 py-2 text-[13px] ${a.isActive ? "" : "text-steel"}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.name} {!a.isActive && <span className="text-[11.5px] text-status-critical">· 사용 중지</span>}{a.isActive && a.mustChangePassword && <span className="text-[11.5px] text-status-warn">· 첫 로그인 전</span>}</p>
                  <p className="truncate text-[12px] text-steel">{a.email}</p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title="임시 비밀번호 만들기"
                  aria-label={`${a.name} 임시 비밀번호 만들기`}
                  disabled={resetting || !a.isActive}
                  onClick={() =>
                    startReset(async () => {
                      const r = await resetCustomerPassword(a.id);
                      if (r.ok) setIssued({ email: a.email, password: r.data.password });
                      else toast.error(r.error);
                    })
                  }
                >
                  <KeyRound />
                </Button>
                {a.isActive ? (
                  <ConfirmButton action={setCustomerActive.bind(null, a.id, false)} title={`${a.name} 사용 중지`} description="이 계정으로 더 이상 로그인·주문할 수 없습니다. 지난 주문 기록은 남습니다." confirmLabel="사용 중지" destructive size="icon-sm" className="text-status-critical" label={`${a.name} 사용 중지`}>
                    <UserX />
                  </ConfirmButton>
                ) : (
                  <ConfirmButton action={setCustomerActive.bind(null, a.id, true)} title={`${a.name} 다시 사용`} description="이 계정으로 다시 로그인·주문할 수 있습니다." confirmLabel="다시 사용" size="icon-sm" label={`${a.name} 다시 사용`}>
                    <UserCheck />
                  </ConfirmButton>
                )}
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <form action={action} className="space-y-3 rounded-md border p-3">
            <input type="hidden" name="partnerId" value={partner.id} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ca-name">사용자 이름</Label>
                <Input id="ca-name" name="name" required placeholder="예: 김대리" maxLength={50} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ca-email">로그인 이메일</Label>
                <Input id="ca-email" name="email" type="email" required placeholder="shop@example.com" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="ca-pw">비밀번호 (비워 두면 자동으로 만듭니다)</Label>
                <Input id="ca-pw" name="password" type="password" minLength={8} autoComplete="new-password" placeholder="8자 이상" />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-[13px] text-steel">
                <input type="checkbox" name="mustChange" value="true" defaultChecked className="size-4 accent-primary" /> 처음 로그인할 때 거래처가 비밀번호를 새로 정하게 하기
              </label>
            </div>
            <div className="flex justify-end gap-2">
              {accounts.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>취소</Button>}
              <Button type="submit" size="sm" disabled={pending}>{pending ? "만드는 중…" : "계정 만들기"}</Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => { setAdding(true); setIssued(null); }}>
            <Plus /> 계정 추가
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
