import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

const FACTS = [
  ["부품 마스터", "코드 · 호환기종 · 표준원가"],
  ["재고", "입고 − 출고 = 현재재고, 안전재고 경고"],
  ["원장", "판매 · 입고 · 거래처별 기간 조회"],
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const reason = typeof sp.reason === "string" ? sp.reason : undefined;

  return (
    <main className="grid min-h-svh grid-cols-1 lg:grid-cols-[5fr_7fr]">
      {/* 좌: 브랜드 패널 */}
      <section className="relative flex flex-col justify-between overflow-hidden bg-sidebar px-6 py-6 text-sidebar-foreground lg:px-12 lg:py-10">
        <Brand size="md" className="text-white" />
        <div className="my-10 lg:my-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">Parts &amp; Service</p>
          <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1.05] tracking-tight text-white text-balance sm:text-[52px]">
            수입 부품 재고와
            <br />
            거래처 원장을 한 곳에
          </h1>
          <dl className="mt-8 hidden max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm lg:grid">
            {FACTS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium text-white">{k}</dt>
                <dd className="text-sidebar-foreground/70">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="hidden items-end justify-between text-[11px] text-sidebar-foreground/50 lg:flex">
          <span>내부 직원 전용 시스템</span>
          <span className="hatch h-2 w-40 opacity-80" aria-hidden />
        </div>
      </section>

      {/* 우: 로그인 폼 */}
      <section className="flex items-center justify-center bg-card px-6 py-12 lg:px-12">
        <div className="w-full max-w-[360px]">
          <h2 className="font-display text-[26px] font-semibold tracking-tight">로그인</h2>
          <p className="mt-1 text-sm text-steel">관리자가 발급한 계정으로 들어갑니다.</p>
          {reason === "inactive" && (
            <p className="mt-5 rounded-md border border-status-critical/30 bg-status-critical/5 px-3 py-2 text-sm text-status-critical">
              비활성화된 계정입니다. 관리자에게 문의하세요.
            </p>
          )}
          <div className="mt-7">
            <LoginForm next={next} />
          </div>
          <p className="mt-8 text-xs text-steel">비밀번호를 잊었으면 관리자가 사용자 관리에서 임시 비밀번호를 다시 발급합니다.</p>
        </div>
      </section>
    </main>
  );
}
