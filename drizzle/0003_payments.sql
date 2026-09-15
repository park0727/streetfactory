CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('immediate', 'credit');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sales_order_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"paid_at" date NOT NULL,
	"amount" numeric(14, 0) NOT NULL,
	"method" "payment_method" DEFAULT 'transfer' NOT NULL,
	"memo" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "default_terms" "payment_terms" DEFAULT 'immediate' NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "default_vat" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "vat_applied" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "tax_invoice_issued" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "tax_invoice_date" date;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("sales_order_id");--> statement-breakpoint
CREATE INDEX "payments_partner_date_idx" ON "payments" USING btree ("partner_id","paid_at");