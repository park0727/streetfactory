import { Skeleton } from "@/components/ui/skeleton";

/** 화면 전환 중 빈 화면 대신 보여주는 골격. 서버 응답이 1~2초 걸리는 배포 환경에서 특히 필요하다. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <div className="space-y-2 rounded-md border bg-card p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </div>
  );
}
