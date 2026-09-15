/** 부품 관련 라벨·매핑. 서버/클라이언트 공용. */
export const PART_STATUS = {
  active: "운영중",
  paused: "일시품절",
  discontinued: "단종",
} as const;
export type PartStatus = keyof typeof PART_STATUS;

export const PART_STATUS_FROM_LABEL: Record<string, PartStatus> = Object.fromEntries(
  Object.entries(PART_STATUS).map(([k, v]) => [v, k as PartStatus]),
);

export const STOCK_STATUS = {
  ok: "정상",
  low: "안전재고 부족",
  out: "품절",
} as const;
export type StockStatus = keyof typeof STOCK_STATUS;

/** 부품 셀렉터 표시 라벨 */
export const partLabel = (p: { code: string; name: string; spec?: string | null }) =>
  [p.code, p.name, p.spec].filter(Boolean).join(" | ");
