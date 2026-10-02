"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import { changeMyPassword } from "../../actions";

export function ShopPasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(changeMyPassword, undefined);
  useActionToast(state, () => {
    if (forced) router.replace("/shop");
  });
  return (
    <form action={action} className="space-y-3" key={state?.ok ? "done" : "form"}>
      <div className="space-y-1.5">
        <Label htmlFor="shop-pw">새 비밀번호 (8자 이상)</Label>
        <Input id="shop-pw" name="password" type="password" autoComplete="new-password" minLength={8} required className="h-11 text-base" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shop-pw2">새 비밀번호 확인</Label>
        <Input id="shop-pw2" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-11 text-base" />
      </div>
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "변경 중…" : "비밀번호 저장"}
      </Button>
    </form>
  );
}
