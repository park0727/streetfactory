CREATE TYPE "public"."price_tier" AS ENUM('retail', 'wholesale');--> statement-breakpoint
CREATE TYPE "public"."web_order_status" AS ENUM('pending', 'shipped', 'cancelled');--> statement-breakpoint
CREATE TABLE "customer_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"company_name" text DEFAULT 'Streetfactory' NOT NULL,
	"ceo_name" text,
	"biz_no" text,
	"mail_order_no" text,
	"phone" text,
	"address" text,
	"bank_name" text,
	"bank_account" text,
	"bank_holder" text,
	"order_notice" text,
	"shop_notice" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_order_lines" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"line_no" integer NOT NULL,
	"part_id" bigint NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(14, 0) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_no" text NOT NULL,
	"partner_id" bigint NOT NULL,
	"customer_id" uuid,
	"status" "web_order_status" DEFAULT 'pending' NOT NULL,
	"vat_applied" boolean DEFAULT false NOT NULL,
	"memo" text,
	"cancel_reason" text,
	"sales_order_id" bigint,
	"processed_by" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "web_orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "price_tier" "price_tier" DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "discount_rate" numeric(5, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "wholesale_price" numeric(14, 0) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_order_lines" ADD CONSTRAINT "web_order_lines_order_id_web_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."web_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_order_lines" ADD CONSTRAINT "web_order_lines_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_orders" ADD CONSTRAINT "web_orders_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_orders" ADD CONSTRAINT "web_orders_customer_id_customer_accounts_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_orders" ADD CONSTRAINT "web_orders_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_orders" ADD CONSTRAINT "web_orders_processed_by_profiles_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_order_lines_part_idx" ON "web_order_lines" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "web_orders_status_idx" ON "web_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "web_orders_partner_idx" ON "web_orders" USING btree ("partner_id","created_at");