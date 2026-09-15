import { z } from "zod";

export const CODE_RE = /^[A-Z0-9][A-Z0-9\-_.\/]{1,39}$/;

/** 폼과 엑셀 업로드가 공유하는 부품 스키마 */
export const partSchema = z.object({
  id: z.coerce.number().int().optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CODE_RE, "부품코드는 영문 대문자·숫자·기호(- _ . /) 2~40자입니다."),
  name: z.string().trim().min(1, "부품명을 입력하세요.").max(120),
  categoryId: z.coerce.number().int().positive("카테고리를 선택하세요."),
  spec: z.string().trim().max(200).optional(),
  manufacturer: z.string().trim().max(80).optional(),
  country: z.string().trim().max(40).optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  standardCost: z.coerce.number().min(0, "표준원가는 0 이상").default(0),
  retailPrice: z.coerce.number().min(0, "소비자가는 0 이상").default(0),
  safetyStock: z.coerce.number().int().min(0, "안전재고는 0 이상").default(0),
  status: z.enum(["active", "paused", "discontinued"]).default("active"),
  memo: z.string().trim().max(500).optional(),
  // 신규 등록 시에만
  openingQty: z.coerce.number().int().min(0).optional(),
  openingUnitCost: z.coerce.number().min(0).optional(),
});
export type PartInput = z.infer<typeof partSchema>;

/** FormData → 객체. 빈 문자열과 셀렉트의 "none" 은 undefined 로. */
export function formToObject(fd: FormData) {
  const raw: Record<string, unknown> = {};
  fd.forEach((v, k) => (raw[k] = v === "" || v === "none" ? undefined : v));
  return raw;
}
