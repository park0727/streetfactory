/**
 * 주문 화면 가격 계산. 서버/클라이언트 공용. 금액은 공급가(부가세 별도), 원 단위 반올림.
 *
 * 정가(list)  = 온라인 판매가 > 0 ? 온라인 판매가 : 권장소비자가      — 취소선으로 보여주는 기준
 * 기준가(base) = 거래처가 '도매가' 등급이고 도매가 > 0 ? 도매가 : 정가
 * 할인율       = max(거래처 할인율, 해당 상품에 걸린 할인 규칙 중 가장 큰 율)   — 큰 쪽 하나만
 *                규칙 율 = max(기본 %, 같은 상품 수량이 단계 이상일 때의 %)
 * 판매가       = 기준가 × (1 − 할인율)
 */
export type PriceRule = { priceTier: "retail" | "wholesale"; discountRate: number };
export type PricePart = { id: number; categoryId: number; brandId: number | null; retailPrice: number; wholesalePrice: number; onlinePrice: number };
export type RuleTier = { minQty: number; rate: number };
export type ActiveRule = { id: number; name: string; categoryId: number | null; brandId: number | null; baseRate: number; tiers: RuleTier[]; excluded: number[] };

export type PriceQuote = {
  list: number; // 정가
  unit: number; // 이 수량에서의 판매가
  rate: number; // 적용 할인율 (거래처·규칙 중 큰 것)
  off: number; // 정가 대비 표시 할인율 (도매가 차이 포함, 정수 %)
  nextTier: RuleTier | null; // 수량을 더 사면 받는 다음 단계 (안내용)
};

const clamp = (r: number) => Math.min(Math.max(Number(r) || 0, 0), 90);

export function matchingRules(part: PricePart, rules: ActiveRule[]) {
  return rules.filter((r) => (r.categoryId == null || r.categoryId === part.categoryId) && (r.brandId == null || r.brandId === part.brandId) && !r.excluded.includes(part.id));
}

export function quotePart(part: PricePart, partner: PriceRule, rules: ActiveRule[], qty = 1): PriceQuote {
  const list = part.onlinePrice > 0 ? part.onlinePrice : part.retailPrice;
  const base = partner.priceTier === "wholesale" && part.wholesalePrice > 0 ? part.wholesalePrice : list;
  const applicable = matchingRules(part, rules);
  let ruleRate = 0;
  for (const r of applicable) {
    ruleRate = Math.max(ruleRate, r.baseRate);
    for (const t of r.tiers) if (qty >= t.minQty) ruleRate = Math.max(ruleRate, t.rate);
  }
  const rate = Math.max(clamp(partner.discountRate), clamp(ruleRate));
  const unit = Math.round(base * (1 - rate / 100));
  // 다음 단계: 지금보다 높은 율을 주는 가장 가까운 단계
  let nextTier: RuleTier | null = null;
  for (const r of applicable)
    for (const t of r.tiers)
      if (t.minQty > qty && t.rate > rate && (!nextTier || t.minQty < nextTier.minQty || (t.minQty === nextTier.minQty && t.rate > nextTier.rate))) nextTier = t;
  const off = list > 0 && unit < list ? Math.round((1 - unit / list) * 100) : 0;
  return { list, unit, rate, off, nextTier };
}

/** (이전 호환) 수량 1 기준 판매가 */
export const priceFor = (part: PricePart, partner: PriceRule, rules: ActiveRule[] = []) => quotePart(part, partner, rules, 1).unit;

export const PRICE_TIER = { retail: "권장소비자가", wholesale: "도매가" } as const;

/** 고객에게 보여줄 재고 표시 (수량은 숨김) */
export type Availability = "ok" | "low" | "out";
export const availability = (available: number, status: string): Availability => (status !== "active" || available <= 0 ? "out" : available < 5 ? "low" : "ok");
export const AVAILABILITY_LABEL: Record<Availability, string> = { ok: "주문 가능", low: "소량 남음", out: "품절" };

/** 주문 화면 표시가: 부가세 별도 청구 거래처면 공급가 × 1.1, 아니면 그대로 */
export const shown = (supply: number, vatApplied: boolean) => (vatApplied ? Math.round(supply * 1.1) : supply);
