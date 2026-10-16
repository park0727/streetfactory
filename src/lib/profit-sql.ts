import "server-only";
import { sql } from "drizzle-orm";
import { salesLines } from "@/db/schema";

/** 판매 라인 원가(부가세 제외) = 원가 ÷ 1.1 (src/lib/vat.ts costExVat 와 같은 규칙) */
export const lineCostExVat = sql<number>`round(${salesLines.unitCost} / 1.1, 2)`;
/** 판매 라인 이익 = 수량 × (공급가 − 원가 ÷ 1.1) */
export const lineProfit = sql<number>`${salesLines.qty} * (${salesLines.unitPrice} - ${salesLines.unitCost} / 1.1)`;
