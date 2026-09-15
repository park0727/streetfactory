import { cn } from "@/lib/utils";

/** 워드마크. 사이드바·로그인·모바일 바에서 같은 형태로 반복된다. */
export function Brand({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "text-[15px]", md: "text-[19px]", lg: "text-[44px] leading-none" }[size];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span aria-hidden className="inline-block h-[1em] w-[3px] shrink-0 rounded-sm bg-signal" />
      <span className={cn("font-display font-semibold uppercase tracking-[0.12em] whitespace-nowrap", s)}>
        Street<span className="font-medium opacity-70">factory</span>
      </span>
    </div>
  );
}
