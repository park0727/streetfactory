ALTER TABLE "sales_lines" ADD COLUMN "unit_price_gross" numeric(14, 0);--> statement-breakpoint
ALTER TABLE "web_order_lines" ADD COLUMN "unit_price_gross" numeric(14, 0);