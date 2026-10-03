import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/** 문의 전화. 휴대폰에서 누르면 바로 전화가 걸린다. */
export function ContactCall({ phone, variant = "inline", className }: { phone: string | null | undefined; variant?: "inline" | "header" | "card"; className?: string }) {
  if (!phone) return null;
  const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;
  if (variant === "header")
    return (
      <a href={tel} className={cn("flex h-8 items-center gap-1.5 rounded-md bg-sidebar-accent px-2.5 text-[12.5px] font-medium text-white", className)} aria-label={`문의 전화 ${phone}`}>
        <Phone className="size-3.5" /> <span className="hidden sm:inline">문의</span> {phone}
      </a>
    );
  if (variant === "card")
    return (
      <a href={tel} className={cn("flex items-center gap-3 rounded-md border bg-card px-4 py-3", className)}>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Phone className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-steel">궁금한 점은 전화 주세요</span>
          <span className="tabular block text-[16px] font-semibold">문의 {phone}</span>
        </span>
        <span className="text-[12px] font-medium text-primary">전화 걸기</span>
      </a>
    );
  return (
    <a href={tel} className={cn("inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline", className)}>
      <Phone className="size-3.5" /> 문의 {phone}
    </a>
  );
}
