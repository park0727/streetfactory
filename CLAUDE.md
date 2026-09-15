# Streetfactory ERP

오토바이 수리·부품 업체의 수입 부품 재고·판매·거래처 관리 시스템. 사용자 2~3명, 운영비 0원 목표.

## 문서 (먼저 읽을 것)
- `docs/SPEC.md` — 확정 요구사항과 비즈니스 규칙
- `docs/SCHEMA.md` — 데이터 모델 설명. 원본은 `src/db/schema.ts`
- `docs/SCREENS.md` — 라우트·화면 목록과 공통 UI 규칙

## 스택
Next.js 16 App Router + TypeScript, Tailwind v4 + shadcn/ui(radix-nova), Drizzle + postgres.js,
Supabase(Postgres + Auth, 서울), Cloudflare Workers(OpenNext). 패키지 매니저는 npm.

## 명령
```
npm run dev          # 로컬 개발 (.env.local + .env.secrets 필요)
npm run typecheck    # tsc
npm run lint
npm run db:generate  # 스키마 변경 → drizzle/ 마이그레이션 생성
npm run db:migrate   # DIRECT_URL(5432) 로 마이그레이션 적용
npm run preview      # Workers 런타임으로 로컬 실행 (.dev.vars 필요)
npm run create-admin -- <email> [이름]   # 첫 관리자 생성
npm run deploy       # Cloudflare 배포 (wrangler login 필요)
```

## 로컬 DB 검증
로컬 Postgres 16 이 떠 있으면 `createdb streetfactory_test` 후 `auth.users` 스텁 테이블을 만들고
`DIRECT_URL=postgresql://localhost:5432/streetfactory_test npx drizzle-kit migrate` 로 SQL 을 검증할 수 있다.
인증은 Supabase 전용이라 화면 E2E 는 실제 Supabase 프로젝트가 필요하다.

## 환경변수 (중요)
- `.env.local` 에는 **NEXT_PUBLIC_ 공개값만** 둔다.
- 비밀값(DATABASE_URL, DIRECT_URL, SUPABASE_SECRET_KEY) 은 `.env.secrets` 에만 둔다. OpenNext 는 `.env`, `.env.local`, `.env.{production,development,test}(.local)` 을 **전부** 번들에 넣으므로 이 이름들에 비밀값을 두면 안 된다. `npm run dev` 가 `--env-file=.env.secrets` 로 읽는다.
- 프로덕션 비밀값은 `wrangler secret put` 으로 등록한다. `src/proxy.ts` 와 `src/lib/env.ts` 에서는 비밀값을 참조하지 않는다 (미들웨어는 빌드 시 인라인됨).

## 반드시 지킬 규칙
- **DB 풀 `max` 는 1 로 두지 않는다** (현재 5). 트랜잭션 풀러에 연결 1개로 동시 쿼리를 보내면 응답이 영구히 멈춘다. 페이지 하나에서 `Promise.all` 로 동시에 보내는 쿼리는 5개 이하.
- **재고는 `stock_movements` 만이 원천**이다. 재고 수량 컬럼을 parts 에 추가하지 않는다. 현재재고는 `v_stock`/`v_inventory` 뷰로 읽는다.
- **판매·입고 확정은 DB 함수로만** 한다: `fn_post_sale`, `fn_post_inbound`, 취소는 `fn_unpost_*`. 앱 코드에서 stock_movements 를 직접 insert 하지 않는다 (실사 조정 `adjustment` 제외).
- 판매 라인 `unit_price`/`unit_cost` 는 스냅샷이다. 마스터 변경으로 소급 수정하지 않는다.
- `parts.code` 는 수정 불가. 삭제 대신 `status = discontinued`.
- 전표번호는 `fn_next_seq(prefix, year)` 로 채번. 앱에서 max+1 하지 않는다.
- 금액은 공급가액(부가세 별도) 저장. 원화 정수, 원가 소수 2자리, 외화·환율 소수 4자리.
- **엑셀 생성·파싱은 브라우저에서** (Workers CPU 10ms 제한). 서버는 JSON 만 받는다.
- DB 접근은 서버(Server Action / RSC) 에서 Drizzle 로만. 브라우저에서 supabase-js 로 테이블 접근 금지 (RLS 로 차단되어 있음).
- 권한: `admin` / `staff`, 모듈 플래그 `can_parts` / `can_repair`. 검사는 `src/lib/auth.ts` 헬퍼로.
- 뷰·함수 변경은 `drizzle-kit generate --custom` 으로 SQL 마이그레이션을 추가한다. 기존 마이그레이션 파일은 수정하지 않는다.

## 구조
```
src/app/(auth)/login       로그인
src/app/(app)/…            로그인 필요 화면 (docs/SCREENS.md)
src/db/schema.ts           Drizzle 스키마
src/db/index.ts            DB 클라이언트
src/lib/supabase/          server / client / admin 클라이언트
src/lib/auth.ts            현재 사용자·권한 헬퍼 (requireUser / requireAdmin / requireModule)
src/lib/action-result.ts   Server Action 반환 타입, zod/DB 오류 메시지
src/hooks/use-action-toast.ts  useActionState 결과 → 토스트
src/components/confirm-button.tsx  확인 대화상자 + 서버 액션 버튼
src/proxy.ts               세션 갱신 + 비로그인 리다이렉트
drizzle/                   마이그레이션 (0000 스키마, 0001 뷰·함수·RLS)
```

## 패턴
- 화면 = `page.tsx`(RSC, 조회) + `actions.ts`("use server", zod 검증, revalidatePath) + 클라이언트 표/폼 컴포넌트.
- 폼은 `useActionState` + `useActionToast`. 삭제·비활성화는 `ConfirmButton` 에 바인딩된 액션을 넘긴다.
- 참고 구현: `src/app/(app)/settings/master`, `src/app/(app)/settings/users`.

## UI 규칙
숫자 우측 정렬, `₩#,##0`, 상태 뱃지 색(정상 green / 부족 amber / 품절 red), 표 헤더 sticky, 모바일 반응형 필수.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
