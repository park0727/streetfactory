/** 날짜 유틸 (KST 기준 문자열) */
export function todayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
export function monthStart(d = todayKST()) {
  return d.slice(0, 8) + "01";
}
export function yearStart(d = todayKST()) {
  return d.slice(0, 4) + "-01-01";
}
export function addDays(d: string, n: number) {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const PARTNER_TYPE: Record<string, string> = {
  dealer: "공식대리점",
  service_center: "협력정비센터",
  direct_store: "직영점",
  online_mall: "온라인몰",
  other: "기타",
};
