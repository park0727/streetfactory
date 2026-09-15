"use client";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AnyActionResult } from "@/lib/action-result";

type Props = {
  /** 바인딩된 서버 액션 */
  action: () => Promise<AnyActionResult>;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  children: ReactNode;
  variant?: "ghost" | "outline" | "destructive" | "default" | "secondary" | "link";
  size?: "sm" | "default" | "icon" | "lg" | "icon-sm" | "icon-lg" | "xs" | "icon-xs";
  className?: string;
};

/** 확인 대화상자를 거쳐 서버 액션을 실행하는 버튼. 삭제·비활성화 같은 되돌리기 어려운 작업에 쓴다. */
export function ConfirmButton({ action, title, description, confirmLabel = "확인", destructive, children, variant = "ghost", size = "sm", className }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await action();
                if (r.ok) {
                  toast.success(r.message ?? "완료되었습니다.");
                  setOpen(false);
                } else toast.error(r.error);
              });
            }}
          >
            {pending ? "처리 중…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
