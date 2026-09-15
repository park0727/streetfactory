import { Brand } from "@/components/brand";

/** 루트 로딩: (app) 레이아웃이 사용자 확인을 마치기 전까지 빈 화면 대신 표시된다. */
export default function RootLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background" aria-busy="true" aria-label="불러오는 중">
      <Brand className="text-primary" />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <style>{`@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  );
}
