/** 결제 관련 라벨. 서버/클라이언트 공용. */
export const PAYMENT_TERMS = { immediate: "즉시 결제", credit: "외상 (미수)" } as const;
export type PaymentTerms = keyof typeof PAYMENT_TERMS;
export const PAYMENT_METHOD = { cash: "현금", transfer: "계좌이체", card: "카드", other: "기타" } as const;
export type PaymentMethod = keyof typeof PAYMENT_METHOD;
export const PAY_STATUS = { unpaid: "미수", partial: "부분수금", paid: "완납" } as const;
export type PayStatus = keyof typeof PAY_STATUS;
