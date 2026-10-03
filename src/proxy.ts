import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/lib/env";
import { siteOf, siteUrl, type Site } from "@/lib/site";

const PUBLIC_PATHS = ["/login", "/shop/login", "/shop/signup", "/intro"];

/**
 * 1) 주소별 화면 나누기 (src/lib/site.ts)
 *    - 홈(ridermania.co.kr): "/" 는 회사 소개(/intro), 나머지는 주문·관리자 주소로 보낸다.
 *    - shop.: 보이는 주소 /cart → 내부 경로 /shop/cart 로 rewrite.
 *    - admin.: 그대로. /shop/* 로 오면 shop. 주소로 보낸다.
 * 2) 모든 요청에서 Supabase 세션 쿠키를 갱신하고, 비로그인 사용자는 로그인 화면으로 보낸다.
 *    로그인 쿠키는 주소마다 따로라 직원·거래처 로그인이 섞이지 않는다.
 * 권한(role/module) 검사는 여기서 하지 않고 각 페이지/액션에서 profiles 를 읽어 수행한다.
 */
export async function proxy(request: NextRequest) {
  const rawHost = request.headers.get("host") ?? "";
  const local = /^(localhost|[^:]+\.localhost)(:|$)/.test(rawHost);
  // 로컬 개발 서버는 서버 액션의 redirect 를 자기 주소(localhost:3000)로 다시 요청하므로 원래 주소(x-forwarded-host)를 쓴다.
  // 운영에서는 클라이언트가 보낸 헤더를 믿지 않고 host 만 쓴다.
  const host = (local && request.headers.get("x-forwarded-host")) || rawHost;
  const hostname = host.split(":")[0];
  const { pathname, search } = request.nextUrl;
  const go = (site: Site, path: string, status = 308) => NextResponse.redirect(siteUrl(host, site, path + search), status);
  const stripShop = (p: string) => p.replace(/^\/shop(?=\/|$)/, "") || "/";
  const isShopPath = pathname === "/shop" || pathname.startsWith("/shop/");

  if (hostname.startsWith("www.")) return go("home", pathname, 301);
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  if (!local && proto === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  const site = siteOf(host);
  if (site === "home") {
    if (pathname === "/") return NextResponse.rewrite(new URL("/intro", request.url));
    if (pathname === "/intro") return NextResponse.next();
    return isShopPath ? go("shop", stripShop(pathname)) : go("admin", pathname);
  }
  if (site === "admin" && isShopPath) return go("shop", stripShop(pathname));
  if (site === "shop" && isShopPath) return go("shop", stripShop(pathname)); // 예전 /shop/... 링크

  // 앱이 보는 내부 경로
  const internal = site === "shop" ? (pathname === "/" ? "/shop" : `/shop${pathname}`) : pathname;
  // 레이아웃에서 현재 경로를 알 수 있게 헤더로 전달한다 (강제 비밀번호 변경 리다이렉트용).
  request.headers.set("x-pathname", internal);
  const pass = () => (site === "shop" ? NextResponse.rewrite(new URL(internal + search, request.url), { request }) : NextResponse.next({ request }));
  let response = pass();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = pass();
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims 는 JWT 서명을 로컬(JWKS 캐시)에서 검증한다. 요청마다 Supabase 인증 서버를 호출하지 않는다.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ? { id: data.claims.sub } : null;

  const isPublic = PUBLIC_PATHS.some((p) => internal === p || internal.startsWith(`${p}/`));

  if (!user && !isPublic) {
    // 주문 화면은 거래처 로그인으로, 관리자 화면은 직원 로그인으로 (보이는 주소 기준)
    const url = new URL("/login", request.url);
    if (site !== "shop") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && site === "admin" && pathname === "/login") return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|js)$).*)"],
};
