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
export type ActiveRule = {
  id: number;
  name: string;
  categoryId: number | null;
  brandId: number | null;
  baseRate: number;
  tiers: RuleTier[];
  qtyBasis: "total" | "line"; // total: 이 규칙 대상 상품의 주문 수량 합계, line: 같은 상품 하나
  pickMode: "target" | "picked"; // target: 카테고리·브랜드 전체 − listed, picked: listed 만
  listed: number[];
};

/** 다음 할인 단계 안내 */
export type NextTier = RuleTier & { basis: "total" | "line"; ruleName: string; remaining: number };

export type PriceQuote = {
  list: number; // 정가
  unit: number; // 이 수량에서의 판매가
  rate: number; // 적용 할인율 (거래처·규칙 중 큰 것)
  off: number; // 정가 대비 표시 할인율 (도매가 차이 포함, 정수 %)
  nextTier: NextTier | null; // 더 사면 받는 다음 단계
};

const clamp = (r: number) => Math.min(Math.max(Number(r) || 0, 0), 90);

export function ruleApplies(r: ActiveRule, part: PricePart) {
  if (r.pickMode === "picked") return r.listed.includes(part.id);
  return (r.categoryId == null || r.categoryId === part.categoryId) && (r.brandId == null || r.brandId === part.brandId) && !r.listed.includes(part.id);
}
export const matchingRules = (part: PricePart, rules: ActiveRule[]) => rules.filter((r) => ruleApplies(r, part));

/** 장바구니 전체에서 규칙별 대상 상품 수량 합계 */
export function ruleTotals(lines: { part: PricePart; qty: number }[], rules: ActiveRule[]) {
  const m = new Map<number, number>();
  for (const r of rules) m.set(r.id, lines.reduce((a, l) => a + (ruleApplies(r, l.part) ? l.qty : 0), 0));
  return m;
}

/**
 * 한 상품의 가격. qty = 이 상품 수량. totals 가 있으면 '합계 기준' 규칙은 그 합계로 단계를 판정한다
 * (장바구니·주문). 없으면 이 상품 수량만으로 판정 (상품 목록 표시용).
 */
export function quotePart(part: PricePart, partner: PriceRule, rules: ActiveRule[], qty = 1, totals?: Map<number, number>): PriceQuote {
  const list = part.onlinePrice > 0 ? part.onlinePrice : part.retailPrice;
  const base = partner.priceTier === "wholesale" && part.wholesalePrice > 0 ? part.wholesalePrice : list;
  const applicable = matchingRules(part, rules);
  const countFor = (r: ActiveRule) => (r.qtyBasis === "total" ? (totals?.get(r.id) ?? qty) : qty);
  let ruleRate = 0;
  for (const r of applicable) {
    ruleRate = Math.max(ruleRate, r.baseRate);
    for (const t of r.tiers) if (countFor(r) >= t.minQty) ruleRate = Math.max(ruleRate, t.rate);
  }
  const rate = Math.max(clamp(partner.discountRate), clamp(ruleRate));
  const unit = Math.round(base * (1 - rate / 100));
  let nextTier: NextTier | null = null;
  for (const r of applicable) {
    const n = countFor(r);
    for (const t of r.tiers)
      if (t.minQty > n && t.rate > rate && (!nextTier || t.minQty - n < nextTier.remaining || (t.minQty - n === nextTier.remaining && t.rate > nextTier.rate)))
        nextTier = { ...t, basis: r.qtyBasis, ruleName: r.name, remaining: t.minQty - n };
  }
  const off = list > 0 && unit < list ? Math.round((1 - unit / list) * 100) : 0;
  return { list, unit, rate, off, nextTier };
}

/** 안내 문구: "타이어 할인 상품 합쳐서 10개 이상 사면 10% 할인" / "같은 상품 4개 이상 사면 10% 할인" */
export const tierHint = (t: NextTier) => (t.basis === "total" ? `${t.ruleName} 상품을 합쳐서 ${t.minQty}개 이상 사면 ${t.rate}% 할인` : `같은 상품 ${t.minQty}개 이상 사면 ${t.rate}% 할인`);

/** (이전 호환) 수량 1 기준 판매가 */
export const priceFor = (part: PricePart, partner: PriceRule, rules: ActiveRule[] = []) => quotePart(part, partner, rules, 1).unit;

export const PRICE_TIER = { retail: "권장소비자가", wholesale: "도매가" } as const;

/** 고객에게 보여줄 재고 표시 (수량은 숨김) */
export type Availability = "ok" | "low" | "out";
export const availability = (available: number, status: string): Availability => (status !== "active" || available <= 0 ? "out" : available < 5 ? "low" : "ok");
export const AVAILABILITY_LABEL: Record<Availability, string> = { ok: "주문 가능", low: "소량 남음", out: "품절" };

/** 주문 화면 표시가: 부가세 별도 청구 거래처면 공급가 × 1.1, 아니면 그대로 */
export const shown = (supply: number, vatApplied: boolean) => (vatApplied ? Math.round(supply * 1.1) : supply);
