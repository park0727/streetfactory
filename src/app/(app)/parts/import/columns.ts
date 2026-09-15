import type { XlsxColumn } from "@/lib/excel";

/** 엑셀 헤더 ↔ 필드 매핑. 다운로드 템플릿·업로드 파싱이 함께 쓴다. */
export const PART_COLUMNS: (XlsxColumn & { required?: boolean; importOnly?: boolean })[] = [
  { header: "부품코드", key: "code", width: 14, required: true },
  { header: "부품명", key: "name", width: 28, required: true },
  { header: "카테고리", key: "category", width: 12, required: true },
  { header: "규격/호환기종", key: "spec", width: 26 },
  { header: "제조사", key: "manufacturer", width: 12 },
  { header: "주요수입국", key: "country", width: 10 },
  { header: "공급사", key: "supplier", width: 18 },
  { header: "표준수입원가", key: "standardCost", width: 12, numFmt: "#,##0" },
  { header: "권장소비자가", key: "retailPrice", width: 12, numFmt: "#,##0" },
  { header: "안전재고", key: "safetyStock", width: 9, numFmt: "0" },
  { header: "운영상태", key: "status", width: 10 },
  { header: "메모", key: "memo", width: 24 },
  { header: "기초재고수량", key: "openingQty", width: 11, numFmt: "0", importOnly: true },
  { header: "기초재고단가", key: "openingUnitCost", width: 11, numFmt: "#,##0", importOnly: true },
];

export const EXAMPLE_ROW = {
  code: "BRK-0001",
  name: "브레이크 패드 (앞)",
  category: "브레이크",
  spec: "Honda CBR600RR 07-12",
  manufacturer: "Honda",
  country: "일본",
  supplier: "Webike Japan",
  standardCost: 38000,
  retailPrice: 69000,
  safetyStock: 6,
  status: "운영중",
  memo: "",
  openingQty: 10,
  openingUnitCost: 38000,
};

/** 업로드 행 (헤더 키 기준, 값은 문자열) */
export type ImportRow = Record<string, string>;

export type RowResult = {
  row: number; // 엑셀 행 번호 (2부터)
  code: string;
  action: "insert" | "update" | "error";
  errors: string[];
  notes: string[];
};

export type ValidateResult = {
  rows: RowResult[];
  newCategories: string[];
  newSuppliers: string[];
  inserts: number;
  updates: number;
  errors: number;
};
