import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.");

export const saleSchema = z.object({
  docDate: dateStr,
  partnerId: z.number().int().positive("거래처를 선택하세요."),
  channel: z.string().trim().max(40).optional(),
  memo: z.string().trim().max(300).optional(),
  allowNegative: z.boolean().default(false),
  lines: z
    .array(
      z.object({
        partId: z.number().int().positive("부품을 선택하세요."),
        qty: z.number().int().positive("수량은 1 이상이어야 합니다."),
        unitPrice: z.number().min(0, "단가는 0 이상이어야 합니다."),
      }),
    )
    .min(1, "부품을 한 개 이상 추가하세요.")
    .max(50, "한 전표에 50개 라인까지 가능합니다."),
});
export type SaleInput = z.infer<typeof saleSchema>;

export const inboundSchema = z.object({
  docDate: dateStr,
  supplierId: z.number().int().positive("공급사를 선택하세요."),
  country: z.string().trim().max(40).optional(),
  currency: z.string().trim().length(3, "통화는 3자리 코드입니다.").toUpperCase(),
  exchangeRate: z.number().positive("환율은 0보다 커야 합니다."),
  dutyAmount: z.number().min(0).default(0),
  extraCost: z.number().min(0).default(0),
  shippingMethod: z.string().trim().max(40).optional(),
  customsStatus: z.enum(["pending", "cleared"]).default("cleared"),
  memo: z.string().trim().max(300).optional(),
  lines: z
    .array(
      z.object({
        partId: z.number().int().positive("부품을 선택하세요."),
        qty: z.number().int().positive("수량은 1 이상이어야 합니다."),
        unitPriceFx: z.number().min(0, "단가는 0 이상이어야 합니다."),
      }),
    )
    .min(1, "부품을 한 개 이상 추가하세요.")
    .max(100, "한 전표에 100개 라인까지 가능합니다."),
});
export type InboundInput = z.infer<typeof inboundSchema>;

export const CURRENCIES = ["JPY", "USD", "EUR", "GBP", "CNY", "TWD", "THB", "KRW"] as const;
export const SHIPPING = ["항공", "해상", "특송(EMS/DHL)", "직접 운반"] as const;
