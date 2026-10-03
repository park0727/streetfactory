/**
 * 주소(서브도메인)별 화면 구분. 로컬에서도 같은 규칙(shop.localhost / admin.localhost)을 쓴다.
 *  - ridermania.co.kr       회사 소개 (홈)
 *  - shop.ridermania.co.kr  거래처 주문 화면 (내부 경로 /shop/*)
 *  - admin.ridermania.co.kr 관리자 화면
 */
export type Site = "home" | "shop" | "admin";

const SUBS = ["shop", "admin", "www"];

export function siteOf(host: string): Site {
  const name = host.split(":")[0];
  if (name.startsWith("shop.")) return "shop";
  if (name.startsWith("admin.")) return "admin";
  return "home";
}

/** shop.ridermania.co.kr → ridermania.co.kr (포트 유지) */
export function rootHost(host: string) {
  const [name, port] = host.split(":");
  const labels = name.split(".");
  const root = labels.length > 1 && SUBS.includes(labels[0]) ? labels.slice(1).join(".") : name;
  return port ? `${root}:${port}` : root;
}

/** 다른 화면으로 가는 절대 주소 */
export function siteUrl(currentHost: string, site: Site, path = "/") {
  const root = rootHost(currentHost);
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(root);
  return `${local ? "http" : "https"}://${site === "home" ? "" : `${site}.`}${root}${path}`;
}
