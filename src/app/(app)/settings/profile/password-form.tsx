"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/hooks/use-action-toast";
import { changePassword } from "./actions";

export function PasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(changePassword, undefined);
  useActionToast(state, () => {
    if (forced) router.replace("/");
    else router.refresh();
  });
  return (
    <form action={action} className="max-w-sm space-y-4" key={state?.ok ? "done" : "form"}>
      <div className="space-y-2">
        <Label htmlFor="password">새 비밀번호</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">새 비밀번호 확인</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "변경 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
