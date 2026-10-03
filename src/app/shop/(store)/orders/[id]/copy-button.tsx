"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** 글자와 함께 보이는 복사 버튼 (계좌번호·금액) */
export function CopyButton({ text, label, done = "복사했습니다.", className }: { text: string; label: string; done?: string; className?: string }) {
  return (
    <button
      type="button"
      className={cn("inline-flex h-8 shrink-0 items-center gap-1 rounded-md border bg-card px-2.5 text-[12.5px] font-medium text-foreground active:bg-muted", className)}
      aria-label={label}
      onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success(done), () => toast.error("복사하지 못했습니다. 길게 눌러 직접 복사해 주세요."))}
    >
      <Copy className="size-3.5" /> 복사
    </button>
  );
}
