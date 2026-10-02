"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shopLogin, type ShopLoginState } from "../../actions";

export function ShopLoginForm() {
  const [state, action, pending] = useActionState<ShopLoginState, FormData>(shopLogin, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="shop-email">이메일</Label>
        <Input id="shop-email" name="email" type="email" autoComplete="username" required className="h-11 text-base" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shop-password">비밀번호</Label>
        <Input id="shop-password" name="password" type="password" autoComplete="current-password" required className="h-11 text-base" />
      </div>
      {state?.error && (
        <div role="alert" className="space-y-2.5 rounded-md border border-status-critical/30 bg-status-critical/5 p-3">
          <p className="text-sm text-status-critical">{state.error}</p>
          {state.goto && (
            <Button asChild variant="outline" className="h-10 w-full bg-card">
              <a href={state.goto.href}>{state.goto.label} →</a>
            </Button>
          )}
        </div>
      )}
      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
