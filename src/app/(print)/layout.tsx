/** 인쇄 전용 레이아웃: 사이드바 없이 종이 위에 문서만. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-white text-black">{children}</div>;
}
