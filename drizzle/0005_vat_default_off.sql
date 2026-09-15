ALTER TABLE "partners" ALTER COLUMN "default_vat" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "sales_orders" ALTER COLUMN "vat_applied" SET DEFAULT false;
-- 기존 거래처 기본값도 해제로
UPDATE "partners" SET "default_vat" = false;
