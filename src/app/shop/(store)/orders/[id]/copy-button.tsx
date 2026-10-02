"use client";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      className="rounded p-1 text-steel hover:text-foreground"
      aria-label={label}
      title={label}
      onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success("복사했습니다."))}
    >
      <Copy className="size-4" />
    </button>
  );
}
