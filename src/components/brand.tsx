import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 워드마크. 사이드바·로그인·모바일 바에서 같은 형태로 반복된다.
 * href 를 주면 그 화면(각 주소의 첫 화면)으로 가는 링크가 된다.
 */
export function Brand({ size = "md", className, href }: { size?: "sm" | "md" | "lg"; className?: string; href?: string }) {
  const s = { sm: "text-[15px]", md: "text-[19px]", lg: "text-[44px] leading-none" }[size];
  const mark = (
    <>
      <span aria-hidden className="inline-block h-[1em] w-[3px] shrink-0 rounded-sm bg-signal" />
      <span className={cn("font-display font-semibold uppercase tracking-[0.12em] whitespace-nowrap", s)}>
        Rider<span className="font-medium opacity-70">Mania</span>
      </span>
    </>
  );
  if (href)
    return (
      <Link href={href} aria-label="라이더매니아 처음 화면으로" className={cn("flex w-fit items-center gap-2 rounded-sm outline-offset-4 hover:opacity-85", className)}>
        {mark}
      </Link>
    );
  return <div className={cn("flex items-center gap-2", className)}>{mark}</div>;
}
