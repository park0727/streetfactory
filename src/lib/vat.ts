/**
 * 판매가는 부가세 포함가로 정하고 받는다 (부품 마스터의 가격도 포함가).
 * 장부(판매 라인 unit_price)에는 공급가 = 포함가 ÷ 1.1 (원 단위 반올림)을 두고,
 * 포함가는 unit_price_gross 에 함께 둔다. 전표 총액 = Σ 수량 × 포함가, 부가세 = 총액 − 공급가.
 * DB 뷰 v_sales_settlement 와 같은 규칙이다 (drizzle/0013_settlement_gross.sql).
 */
export const supplyOf = (gross: number) => Math.round(gross / 1.1);

type DocLine = { qty: number; unitPrice: number; unitPriceGross?: number | null };

/** 전표 금액. 포함가가 없는 옛 전표는 예전 계산(부가세 적용 시 공급가 × 1.1). */
export function docTotals(lines: DocLine[], vatApplied: boolean) {
  const supply = lines.reduce((a, l) => a + l.qty * Number(l.unitPrice), 0);
  const hasGross = lines.length > 0 && lines.every((l) => l.unitPriceGross != null);
  const total = hasGross ? lines.reduce((a, l) => a + l.qty * Number(l.unitPriceGross), 0) : vatApplied ? Math.round(supply * 1.1) : supply;
  return { supply, vat: total - supply, total };
}

/** 라인의 포함 단가 (옛 전표는 공급가에서 되살린다) */
export const grossOf = (l: DocLine, vatApplied: boolean) => (l.unitPriceGross != null ? Number(l.unitPriceGross) : vatApplied ? Math.round(Number(l.unitPrice) * 1.1) : Number(l.unitPrice));

/**
 * 원가는 부가세 포함으로 입력한다 (수입 부가세·수수료 부가세 포함, 사용자 결정).
 * 매입 부가세는 신고 때 공제받으므로 이익 = 공급가 − 원가 ÷ 1.1. 재고 평가액은 입력한 원가 그대로 둔다.
 * SQL 쪽은 src/lib/profit-sql.ts 가 같은 규칙.
 */
export const costExVat = (cost: number) => Number(cost) / 1.1;
