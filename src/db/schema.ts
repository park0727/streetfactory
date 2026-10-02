/**
 * Streetfactory ERP 데이터 모델 (원본). 설명은 docs/SCHEMA.md 참고.
 *
 * 금액 규칙: 원화는 정수(₩), 외화 단가·환율은 소수 4자리, 원가는 소수 2자리.
 * 모든 금액은 공급가액(부가세 별도).
 */
import {
  bigint,
  bigserial,
  boolean,
  char,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------- enums ----------
export const userRole = pgEnum("user_role", ["admin", "staff"]);
export const partStatus = pgEnum("part_status", ["active", "paused", "discontinued"]);
export const partnerType = pgEnum("partner_type", [
  "dealer", // 공식대리점
  "service_center", // 협력정비센터
  "direct_store", // 직영점
  "online_mall", // 온라인몰
  "other",
]);
export const salesSource = pgEnum("sales_source", ["sale", "repair"]);
export const customsStatus = pgEnum("customs_status", ["pending", "cleared"]);
export const movementType = pgEnum("movement_type", ["opening", "inbound", "sale", "adjustment"]);
export const paymentTerms = pgEnum("payment_terms", ["immediate", "credit"]); // 즉시결제 / 외상
export const paymentMethod = pgEnum("payment_method", ["cash", "transfer", "card", "other"]);
export const priceTier = pgEnum("price_tier", ["retail", "wholesale"]); // 거래처 기준가: 권장소비자가 / 도매가
export const webOrderStatus = pgEnum("web_order_status", ["pending", "shipped", "cancelled"]);

// ---------- 공통 컬럼 ----------
const krw = (name: string) => numeric(name, { precision: 14, scale: 0, mode: "number" });
const cost = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" });
const fx = (name: string) => numeric(name, { precision: 14, scale: 4, mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------- 사용자 ----------
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("staff"),
  canParts: boolean("can_parts").notNull().default(true),
  canRepair: boolean("can_repair").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------- 기준 데이터 ----------
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const salesChannels = pgTable("sales_channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  contact: text("contact"),
  memo: text("memo"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------- 부품 마스터 (SSOT) ----------
export const parts = pgTable(
  "parts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: text("code").notNull().unique(), // 생성 후 불변 (앱에서 강제)
    name: text("name").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    spec: text("spec"), // 규격 / 호환기종
    manufacturer: text("manufacturer"),
    country: text("country"), // 주요 수입국
    supplierId: integer("supplier_id").references(() => suppliers.id),
    standardCost: krw("standard_cost").notNull().default(0), // 표준수입원가 (참고값)
    retailPrice: krw("retail_price").notNull().default(0), // 권장소비자가
    wholesalePrice: krw("wholesale_price").notNull().default(0), // 도매가 (0 이면 권장소비자가 사용)
    online: boolean("online").notNull().default(false), // 고객 주문 화면 노출
    avgCost: cost("avg_cost").notNull().default(0), // 이동평균 원가
    safetyStock: integer("safety_stock").notNull().default(0),
    status: partStatus("status").notNull().default("active"),
    memo: text("memo"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("parts_name_idx").on(t.name), index("parts_category_status_idx").on(t.categoryId, t.status)],
);

// ---------- 거래처 ----------
export const partners = pgTable("partners", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(), // P-0001
  name: text("name").notNull(),
  type: partnerType("type").notNull().default("dealer"),
  bizNo: text("biz_no"), // 사업자등록번호 (세금계산서용), 숫자 10자리 저장
  defaultTerms: paymentTerms("default_terms").notNull().default("immediate"), // 출고 등록 시 자동 선택
  defaultVat: boolean("default_vat").notNull().default(false), // 부가세 별도 청구(세금계산서) 기본값. 기본 해제
  priceTier: priceTier("price_tier").notNull().default("retail"), // 온라인 주문 기준가
  discountRate: numeric("discount_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(0), // 기준가에서 추가 할인 %
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  memo: text("memo"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------- 판매 전표 ----------
export const salesOrders = pgTable(
  "sales_orders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    docNo: text("doc_no").notNull().unique(), // SLS-YYYY-NNNNN
    docDate: date("doc_date").notNull(),
    partnerId: bigint("partner_id", { mode: "number" })
      .notNull()
      .references(() => partners.id),
    channel: text("channel"),
    source: salesSource("source").notNull().default("sale"),
    repairOrderId: bigint("repair_order_id", { mode: "number" }), // 2차 정비 모듈 연결
    vatApplied: boolean("vat_applied").notNull().default(false), // true 면 받을 금액 = 공급가 × 1.1
    taxInvoiceIssued: boolean("tax_invoice_issued").notNull().default(false),
    taxInvoiceDate: date("tax_invoice_date"),
    dueDate: date("due_date"), // 외상 결제 예정일
    memo: text("memo"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
  },
  (t) => [index("sales_orders_date_idx").on(t.docDate), index("sales_orders_partner_date_idx").on(t.partnerId, t.docDate)],
);

export const salesLines = pgTable(
  "sales_lines",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("order_id", { mode: "number" })
      .notNull()
      .references(() => salesOrders.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    partId: bigint("part_id", { mode: "number" })
      .notNull()
      .references(() => parts.id),
    qty: integer("qty").notNull(),
    unitPrice: krw("unit_price").notNull(), // 스냅샷
    unitCost: cost("unit_cost").notNull(), // 스냅샷 (판매 시점 avg_cost)
  },
  (t) => [index("sales_lines_part_idx").on(t.partId)],
);

// ---------- 수금 (미수금의 유일한 원천: 전표 총액 − 수금 합계 = 미수 잔액) ----------
export const payments = pgTable(
  "payments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    salesOrderId: bigint("sales_order_id", { mode: "number" })
      .notNull()
      .references(() => salesOrders.id, { onDelete: "restrict" }),
    partnerId: bigint("partner_id", { mode: "number" })
      .notNull()
      .references(() => partners.id),
    paidAt: date("paid_at").notNull(),
    amount: krw("amount").notNull(),
    method: paymentMethod("method").notNull().default("transfer"),
    memo: text("memo"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
  },
  (t) => [index("payments_order_idx").on(t.salesOrderId), index("payments_partner_date_idx").on(t.partnerId, t.paidAt)],
);

// ---------- 입고 전표 ----------
export const inboundOrders = pgTable(
  "inbound_orders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    docNo: text("doc_no").notNull().unique(), // INB-YYYY-NNNNN
    docDate: date("doc_date").notNull(),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    country: text("country"),
    currency: char("currency", { length: 3 }).notNull().default("KRW"),
    exchangeRate: fx("exchange_rate").notNull().default(1),
    dutyAmount: krw("duty_amount").notNull().default(0), // 관세
    extraCost: krw("extra_cost").notNull().default(0), // 운송 등 부대비용
    shippingMethod: text("shipping_method"),
    customsStatus: customsStatus("customs_status").notNull().default("cleared"),
    memo: text("memo"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
  },
  (t) => [index("inbound_orders_date_idx").on(t.docDate)],
);

export const inboundLines = pgTable(
  "inbound_lines",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("order_id", { mode: "number" })
      .notNull()
      .references(() => inboundOrders.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    partId: bigint("part_id", { mode: "number" })
      .notNull()
      .references(() => parts.id),
    qty: integer("qty").notNull(),
    unitPriceFx: fx("unit_price_fx").notNull(), // 외화 단가
    unitPriceKrw: cost("unit_price_krw").notNull(), // = fx × 환율
    allocatedCost: cost("allocated_cost").notNull().default(0), // 라인에 배분된 부대비용 합계
    landedUnitCost: cost("landed_unit_cost").notNull(), // 개당 실질원가
  },
  (t) => [index("inbound_lines_part_idx").on(t.partId)],
);

// ---------- 재고 이동 (재고의 유일한 원천) ----------
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    partId: bigint("part_id", { mode: "number" })
      .notNull()
      .references(() => parts.id),
    type: movementType("type").notNull(),
    qty: integer("qty").notNull(), // 부호 포함
    unitCost: cost("unit_cost").notNull().default(0),
    salesLineId: bigint("sales_line_id", { mode: "number" }).references(() => salesLines.id, { onDelete: "cascade" }),
    inboundLineId: bigint("inbound_line_id", { mode: "number" }).references(() => inboundLines.id, {
      onDelete: "cascade",
    }),
    occurredAt: date("occurred_at").notNull(),
    memo: text("memo"),
    createdBy: uuid("created_by").references(() => profiles.id),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_part_idx").on(t.partId), index("stock_movements_date_idx").on(t.occurredAt)],
);

// ---------- 고객(거래처) 주문 계정 ----------
export const customerAccounts = pgTable("customer_accounts", {
  id: uuid("id").primaryKey(), // = auth.users.id
  partnerId: bigint("partner_id", { mode: "number" })
    .notNull()
    .references(() => partners.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

// ---------- 온라인 주문 (접수 → 출고 처리 시 판매 전표 생성) ----------
export const webOrders = pgTable(
  "web_orders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderNo: text("order_no").notNull().unique(), // WEB-YYYY-NNNNN
    partnerId: bigint("partner_id", { mode: "number" })
      .notNull()
      .references(() => partners.id),
    customerId: uuid("customer_id").references(() => customerAccounts.id),
    status: webOrderStatus("status").notNull().default("pending"),
    vatApplied: boolean("vat_applied").notNull().default(false), // 주문 시점 거래처 설정 스냅샷
    memo: text("memo"),
    cancelReason: text("cancel_reason"),
    salesOrderId: bigint("sales_order_id", { mode: "number" }).references(() => salesOrders.id, { onDelete: "set null" }),
    processedBy: uuid("processed_by").references(() => profiles.id),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("web_orders_status_idx").on(t.status, t.createdAt), index("web_orders_partner_idx").on(t.partnerId, t.createdAt)],
);

export const webOrderLines = pgTable(
  "web_order_lines",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: bigint("order_id", { mode: "number" })
      .notNull()
      .references(() => webOrders.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    partId: bigint("part_id", { mode: "number" })
      .notNull()
      .references(() => parts.id),
    qty: integer("qty").notNull(),
    unitPrice: krw("unit_price").notNull(), // 주문 시점 거래처 적용가 스냅샷 (공급가)
  },
  (t) => [index("web_order_lines_part_idx").on(t.partId)],
);

// ---------- 쇼핑 설정 (단일 행 id = 1) ----------
export const shopSettings = pgTable("shop_settings", {
  id: integer("id").primaryKey(),
  companyName: text("company_name").notNull().default("Streetfactory"),
  ceoName: text("ceo_name"),
  bizNo: text("biz_no"),
  mailOrderNo: text("mail_order_no"), // 통신판매업 신고번호
  phone: text("phone"),
  address: text("address"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankHolder: text("bank_holder"),
  orderNotice: text("order_notice"), // 주문 완료 화면 안내문
  shopNotice: text("shop_notice"), // 상품 화면 상단 공지
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- 채번 ----------
export const docSequences = pgTable(
  "doc_sequences",
  {
    prefix: text("prefix").notNull(),
    year: integer("year").notNull(),
    lastNo: integer("last_no").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.prefix, t.year] })],
);

// ---------- relations ----------
export const partsRelations = relations(parts, ({ one, many }) => ({
  category: one(categories, { fields: [parts.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [parts.supplierId], references: [suppliers.id] }),
  movements: many(stockMovements),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  partner: one(partners, { fields: [salesOrders.partnerId], references: [partners.id] }),
  lines: many(salesLines),
}));

export const salesLinesRelations = relations(salesLines, ({ one }) => ({
  order: one(salesOrders, { fields: [salesLines.orderId], references: [salesOrders.id] }),
  part: one(parts, { fields: [salesLines.partId], references: [parts.id] }),
}));

export const inboundOrdersRelations = relations(inboundOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [inboundOrders.supplierId], references: [suppliers.id] }),
  lines: many(inboundLines),
}));

export const inboundLinesRelations = relations(inboundLines, ({ one }) => ({
  order: one(inboundOrders, { fields: [inboundLines.orderId], references: [inboundOrders.id] }),
  part: one(parts, { fields: [inboundLines.partId], references: [parts.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  part: one(parts, { fields: [stockMovements.partId], references: [parts.id] }),
}));

// ---------- 타입 ----------
export type Profile = typeof profiles.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type SalesLine = typeof salesLines.$inferSelect;
export type InboundOrder = typeof inboundOrders.$inferSelect;
export type InboundLine = typeof inboundLines.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type CustomerAccount = typeof customerAccounts.$inferSelect;
export type WebOrder = typeof webOrders.$inferSelect;
export type ShopSettings = typeof shopSettings.$inferSelect;

// sql 은 뷰/함수 정의(drizzle/custom SQL)에서 재사용
export { sql };

// ---------- 뷰 (drizzle/0001 에서 SQL 로 정의. 여기서는 읽기용 타입만 선언) ----------
import { pgView } from "drizzle-orm/pg-core";

export const vStock = pgView("v_stock", {
  partId: bigint("part_id", { mode: "number" }).notNull(),
  qty: integer("qty").notNull(),
  openingQty: integer("opening_qty").notNull(),
  inboundQty: integer("inbound_qty").notNull(),
  soldQty: integer("sold_qty").notNull(),
  adjustmentQty: integer("adjustment_qty").notNull(),
}).existing();

export const vInventory = pgView("v_inventory", {
  id: bigint("id", { mode: "number" }).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  categoryId: integer("category_id").notNull(),
  categoryName: text("category_name").notNull(),
  spec: text("spec"),
  manufacturer: text("manufacturer"),
  country: text("country"),
  supplierId: integer("supplier_id"),
  standardCost: numeric("standard_cost", { precision: 14, scale: 0, mode: "number" }).notNull(),
  retailPrice: numeric("retail_price", { precision: 14, scale: 0, mode: "number" }).notNull(),
  avgCost: numeric("avg_cost", { precision: 14, scale: 2, mode: "number" }).notNull(),
  safetyStock: integer("safety_stock").notNull(),
  status: partStatus("status").notNull(),
  qty: integer("qty").notNull(),
  openingQty: integer("opening_qty").notNull(),
  inboundQty: integer("inbound_qty").notNull(),
  soldQty: integer("sold_qty").notNull(),
  adjustmentQty: integer("adjustment_qty").notNull(),
  stockStatus: text("stock_status").$type<"ok" | "low" | "out">().notNull(),
  stockValue: numeric("stock_value", { precision: 16, scale: 0, mode: "number" }).notNull(),
}).existing();

/** 전표별 정산: 총액(부가세 반영) − 수금 = 미수 잔액 */
export const vSalesSettlement = pgView("v_sales_settlement", {
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  docDate: date("doc_date").notNull(),
  vatApplied: boolean("vat_applied").notNull(),
  dueDate: date("due_date"),
  amountSupply: numeric("amount_supply", { precision: 16, scale: 0, mode: "number" }).notNull(),
  amountTotal: numeric("amount_total", { precision: 16, scale: 0, mode: "number" }).notNull(),
  paid: numeric("paid", { precision: 16, scale: 0, mode: "number" }).notNull(),
  balance: numeric("balance", { precision: 16, scale: 0, mode: "number" }).notNull(),
  payStatus: text("pay_status").$type<"unpaid" | "partial" | "paid">().notNull(),
}).existing();

/** 주문 가능 재고 = 현재재고 − 접수 대기 중인 온라인 주문 수량 */
export const vAvailable = pgView("v_available", {
  partId: bigint("part_id", { mode: "number" }).notNull(),
  qty: integer("qty").notNull(),
  reserved: integer("reserved").notNull(),
  available: integer("available").notNull(),
}).existing();

export const vPartnerStats = pgView("v_partner_stats", {
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  orderCount: integer("order_count").notNull(),
  totalAmount: numeric("total_amount", { precision: 16, scale: 0, mode: "number" }).notNull(),
  lastDate: date("last_date"),
}).existing();
