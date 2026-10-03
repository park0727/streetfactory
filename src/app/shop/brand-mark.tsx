import { cn } from "@/lib/utils";

/** 브랜드 로고(없으면 이름). 사이즈 밑에 작게. */
export function BrandMark({ name, logo, className }: { name: string | null; logo: string | null; className?: string }) {
  if (!name) return null;
  if (logo)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 업로드한 로고 원본
      <img src={logo} alt={name} title={name} className={cn("h-4 w-auto max-w-[96px] object-contain object-left", className)} loading="lazy" />
    );
  return <p className={cn("text-[11.5px] font-semibold tracking-wide text-steel uppercase", className)}>{name}</p>;
}
