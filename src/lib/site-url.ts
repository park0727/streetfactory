import "server-only";
import { headers } from "next/headers";
import { siteUrl, type Site } from "./site";

/** 서버에서 현재 요청 주소를 기준으로 다른 화면의 절대 주소를 만든다 */
export async function urlFor(site: Site, path = "/") {
  const host = (await headers()).get("host") ?? "ridermania.co.kr";
  return siteUrl(host, site, path);
}
