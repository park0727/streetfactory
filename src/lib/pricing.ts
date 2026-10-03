/** 거래처 적용가. 서버/클라이언트 공용. 금액은 공급가(부가세 별도), 원 단위 반올림. */
export type PriceRule = { priceTier: "retail" | "wholesale"; discountRate: number };
export type PriceBase = { retailPrice: number; wholesalePrice: number };

export function priceFor(part: PriceBase, rule: PriceRule): number {
  const base = rule.priceTier === "wholesale" && part.wholesalePrice > 0 ? part.wholesalePrice : part.retailPrice;
  const rate = Math.min(Math.max(rule.discountRate || 0, 0), 100);
  return Math.round(base * (1 - rate / 100));
}

export const PRICE_TIER = { retail: "권장소비자가", wholesale: "도매가" } as const;

/** 고객에게 보여줄 재고 표시 (수량은 숨김) */
export type Availability = "ok" | "low" | "out";
export const availability = (available: number, status: string): Availability => (status !== "active" || available <= 0 ? "out" : available < 5 ? "low" : "ok");
export const AVAILABILITY_LABEL: Record<Availability, string> = { ok: "주문 가능", low: "소량 남음", out: "품절" };

/** 주문 화면 표시가: 부가세 별도 청구 거래처면 공급가 × 1.1, 아니면 그대로 */
export const shown = (supply: number, vatApplied: boolean) => (vatApplied ? Math.round(supply * 1.1) : supply);
