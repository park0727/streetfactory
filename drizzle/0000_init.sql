CREATE TYPE "public"."customs_status" AS ENUM('pending', 'cleared');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('opening', 'inbound', 'sale', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."part_status" AS ENUM('active', 'paused', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."partner_type" AS ENUM('dealer', 'service_center', 'direct_store', 'online_mall', 'other');--> statement-breakpoint
CREATE TYPE "public"."sales_source" AS ENUM('sale', 'repair');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "doc_sequences" (
	"prefix" text NOT NULL,
	"year" integer NOT NULL,
	"last_no" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "doc_sequences_prefix_year_pk" PRIMARY KEY("prefix","year")
);
--> statement-breakpoint
CREATE TABLE "inbound_lines" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"line_no" integer NOT NULL,
	"part_id" bigint NOT NULL,
	"qty" integer NOT NULL,
	"unit_price_fx" numeric(14, 4) NOT NULL,
	"unit_price_krw" numeric(14, 2) NOT NULL,
	"allocated_cost" numeric(14, 2) DEFAULT 0 NOT NULL,
	"landed_unit_cost" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbound_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"doc_no" text NOT NULL,
	"doc_date" date NOT NULL,
	"supplier_id" integer,
	"country" text,
	"currency" char(3) DEFAULT 'KRW' NOT NULL,
	"exchange_rate" numeric(14, 4) DEFAULT 1 NOT NULL,
	"duty_amount" numeric(14, 0) DEFAULT 0 NOT NULL,
	"extra_cost" numeric(14, 0) DEFAULT 0 NOT NULL,
	"shipping_method" text,
	"customs_status" "customs_status" DEFAULT 'cleared' NOT NULL,
	"memo" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbound_orders_doc_no_unique" UNIQUE("doc_no")
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "partner_type" DEFAULT 'dealer' NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"address" text,
	"memo" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partners_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"spec" text,
	"manufacturer" text,
	"country" text,
	"supplier_id" integer,
	"standard_cost" numeric(14, 0) DEFAULT 0 NOT NULL,
	"retail_price" numeric(14, 0) DEFAULT 0 NOT NULL,
	"avg_cost" numeric(14, 2) DEFAULT 0 NOT NULL,
	"safety_stock" integer DEFAULT 0 NOT NULL,
	"status" "part_status" DEFAULT 'active' NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"can_parts" boolean DEFAULT true NOT NULL,
	"can_repair" boolean DEFAULT false NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "sales_channels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sales_lines" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"line_no" integer NOT NULL,
	"part_id" bigint NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(14, 0) NOT NULL,
	"unit_cost" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"doc_no" text NOT NULL,
	"doc_date" date NOT NULL,
	"partner_id" bigint NOT NULL,
	"channel" text,
	"source" "sales_source" DEFAULT 'sale' NOT NULL,
	"repair_order_id" bigint,
	"memo" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_orders_doc_no_unique" UNIQUE("doc_no")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"part_id" bigint NOT NULL,
	"type" "movement_type" NOT NULL,
	"qty" integer NOT NULL,
	"unit_cost" numeric(14, 2) DEFAULT 0 NOT NULL,
	"sales_line_id" bigint,
	"inbound_line_id" bigint,
	"occurred_at" date NOT NULL,
	"memo" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"contact" text,
	"memo" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inbound_lines" ADD CONSTRAINT "inbound_lines_order_id_inbound_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."inbound_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_lines" ADD CONSTRAINT "inbound_lines_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_orders" ADD CONSTRAINT "inbound_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbound_orders" ADD CONSTRAINT "inbound_orders_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lines" ADD CONSTRAINT "sales_lines_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_lines" ADD CONSTRAINT "sales_lines_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sales_line_id_sales_lines_id_fk" FOREIGN KEY ("sales_line_id") REFERENCES "public"."sales_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inbound_line_id_inbound_lines_id_fk" FOREIGN KEY ("inbound_line_id") REFERENCES "public"."inbound_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbound_lines_part_idx" ON "inbound_lines" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "inbound_orders_date_idx" ON "inbound_orders" USING btree ("doc_date");--> statement-breakpoint
CREATE INDEX "parts_name_idx" ON "parts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "parts_category_status_idx" ON "parts" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "sales_lines_part_idx" ON "sales_lines" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "sales_orders_date_idx" ON "sales_orders" USING btree ("doc_date");--> statement-breakpoint
CREATE INDEX "sales_orders_partner_date_idx" ON "sales_orders" USING btree ("partner_id","doc_date");--> statement-breakpoint
CREATE INDEX "stock_movements_part_idx" ON "stock_movements" USING btree ("part_id");--> statement-breakpoint
CREATE INDEX "stock_movements_date_idx" ON "stock_movements" USING btree ("occurred_at");