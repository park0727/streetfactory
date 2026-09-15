const krwFmt = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("ko-KR");

/** ₩12,345 */
export const krw = (n: number | string | null | undefined) => `₩${krwFmt.format(Number(n ?? 0))}`;
/** 12,345 */
export const num = (n: number | string | null | undefined, digits = 0) =>
  Number(n ?? 0).toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** 12.3% */
export const pct = (n: number | null | undefined, digits = 1) => `${(n ?? 0).toFixed(digits)}%`;
/** 부가세 포함가 (10%) */
export const withVat = (n: number) => Math.round(n * 1.1);

export const VAT_RATE = 0.1;
export { numFmt };
