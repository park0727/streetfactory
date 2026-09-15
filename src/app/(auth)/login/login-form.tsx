"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus className="h-10 text-[15px]" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">비밀번호</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="h-10 text-[15px]" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-status-critical">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="h-10 w-full text-[15px]" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
