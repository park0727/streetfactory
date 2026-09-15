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
npm run create-admin -- <email> [이름]   # 첫 관리자 생성
node --env-file=.env.secrets --env-file=.env.local scripts/reset-data.mjs --yes   # 업무 데이터 전체 초기화 (사용자·채널 유지)
npm run deploy       # Cloudflare 배포 (wrangler login 필요). scripts/cf.mjs 가 Hyperdrive 로컬 변수를 채워 준다
npm run preview      # Workers 런타임으로 로컬 실행
```

## 로컬 DB 검증
로컬 Postgres 16 이 떠 있으면 `createdb streetfactory_test` 후 `auth.users` 스텁 테이블을 만들고
`DIRECT_URL=postgresql://localhost:5432/streetfactory_test npx drizzle-kit migrate` 로 SQL 을 검증할 수 있다.
인증은 Supabase 전용이라 화면 E2E 는 실제 Supabase 프로젝트가 필요하다.

## 배포 환경 메모
- 한국에서 workers.dev 로 접속하면 요청이 LAX(미국) PoP 로 들어오는 경우가 있다. Smart Placement(`placement.mode: smart`) 와 Hyperdrive 로 DB 왕복을 줄였다. 응답 1~1.5초 수준이면 정상.
- Worker 번들은 gzip 약 4MB. 무료 플랜 한도 근처이므로 서버 번들에 큰 라이브러리를 추가하지 않는다 (exceljs·recharts 는 클라이언트 전용).

## 환경변수 (중요)
- `.env.local` 에는 **NEXT_PUBLIC_ 공개값만** 둔다.
- 비밀값(DATABASE_URL, DIRECT_URL, SUPABASE_SECRET_KEY) 은 `.env.secrets` 에만 둔다. OpenNext 는 `.env`, `.env.local`, `.env.{production,development,test}(.local)` 을 **전부** 번들에 넣으므로 이 이름들에 비밀값을 두면 안 된다. `npm run dev` 가 `--env-file=.env.secrets` 로 읽는다.
- 프로덕션 비밀값은 `wrangler secret put` 으로 등록한다. `src/proxy.ts` 와 `src/lib/env.ts` 에서는 비밀값을 참조하지 않는다 (미들웨어는 빌드 시 인라인됨).

## 반드시 지킬 규칙
- **DB 풀 `max` 는 1 로 두지 않는다** (현재 5). 트랜잭션 풀러에 연결 1개로 동시 쿼리를 보내면 응답이 영구히 멈춘다. 페이지 하나에서 `Promise.all` 로 동시에 보내는 쿼리는 5개 이하.
- **Workers 에서는 DB 클라이언트를 요청 간에 공유하지 않는다.** `src/db/index.ts` 가 프로덕션에서 React `cache()` 로 요청마다 새 클라이언트를 만든다. 전역 캐시로 되돌리면 "Failed query" 간헐 오류가 난다.
- 프로덕션 DB 접속은 **Hyperdrive** 바인딩(`wrangler.jsonc`) 을 통한다. 원본은 Supabase 세션 풀러(5432). **쿼리 캐시는 꺼 둔다**(`--caching-disabled`). 켜면 저장 후 최대 60초 동안 목록이 옛 값을 보여준다.
- 인증 확인은 `supabase.auth.getClaims()` (로컬 JWT 검증). `getUser()` 는 요청마다 Supabase 서버를 호출하므로 쓰지 않는다.
- 비밀번호 변경·발급은 모두 서비스 키의 `auth.admin.updateUserById` 로 한다. 서버 액션에서 세션 쿠키 기반 `updateUser` 는 "Auth session missing" 이 날 수 있어 쓰지 않는다.
- 로그인 액션이 임시 비밀번호 상태를 확인해 바로 `/settings/profile` 로 보낸다. `src/app/loading.tsx` 가 레이아웃 준비 중 빈 화면을 막는다.
- **재고는 `stock_movements` 만이 원천**이다. 재고 수량 컬럼을 parts 에 추가하지 않는다. 현재재고는 `v_stock`/`v_inventory` 뷰로 읽는다.
- **판매·입고 확정은 DB 함수로만** 한다: `fn_post_sale`, `fn_post_inbound`, 취소는 `fn_unpost_*`. 앱 코드에서 stock_movements 를 직접 insert 하지 않는다 (실사 조정 `adjustment` 제외). 전표 수정 = 트랜잭션 안에서 unpost → 라인 교체 → post (전표번호 유지).
- 수정·삭제 권한은 부품 모듈 사용자 전체 (소규모 팀). 사용자 관리만 admin 전용.
- 저장·삭제 성공 시 `useActionToast` / `ConfirmButton` 이 `router.refresh()` 를 호출한다. 목록 갱신을 위해 별도 처리하지 않아도 된다.
- **미수금은 `payments` 합계로만 계산**한다 (`v_sales_settlement`). 전표에 결제상태 컬럼을 두지 않는다. 총액은 `vat_applied` 면 공급가 × 1.1.
- 인쇄 페이지(`src/app/(print)`) 에는 원가·이익을 절대 넣지 않는다 (배달 기사용).
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
- **체크박스는 해제 시 FormData 에 값이 실리지 않는다.** 서버에서 `fd.get("x") === "true"` 로 명시 판정하고 `z.boolean()` 을 쓴다. `z.coerce.boolean().default(true)` 는 해제 저장이 안 되는 버그를 만든다.
- 참고 구현: `src/app/(app)/settings/master`(단순 CRUD), `src/app/(app)/parts`(검색·필터·엑셀), `src/app/(app)/entry`(복합 폼 + 서버 액션 JSON 입력).
- **단일 테이블 select 안의 상관 서브쿼리**에서 바깥 컬럼은 `${table.col}` 대신 `sales_orders.id` 처럼 테이블명을 직접 쓴다. drizzle 이 조인 없는 select 의 컬럼을 `"id"` 로만 렌더링해 서브쿼리의 같은 이름 컬럼을 가리키는 버그가 있었다.
- 목록 필터는 URL 쿼리(`useUrlFilters`, `useDebouncedParam`) 로. 서버 페이지가 `searchParams` 를 읽어 쿼리한다.
- 엑셀 다운로드 = `/<route>/export` 라우트 핸들러(JSON) + 클라이언트 `downloadXlsx`. 업로드 = 클라이언트 `readXlsx` → 서버 검증 액션 → 미리보기 → 저장 액션.
- 화면 검증: 로컬 Postgres `streetfactory_test` 에 `scripts/seed-sample.mjs` 로 샘플을 넣고 `DATABASE_URL=postgresql://localhost:5432/streetfactory_test npm run dev` 로 띄운다. 운영 DB 에는 샘플을 넣지 않는다.

## UI 규칙
숫자 우측 정렬, `₩#,##0`, 상태 뱃지 색(정상 green / 부족 amber / 품절 red), 표 헤더 sticky, 모바일 반응형 필수.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
