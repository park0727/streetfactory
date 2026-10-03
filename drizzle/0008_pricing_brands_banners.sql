CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"title" text,
	"link_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "discount_rule_exclusions" (
	"rule_id" integer NOT NULL,
	"part_id" bigint NOT NULL,
	CONSTRAINT "discount_rule_exclusions_rule_id_part_id_pk" PRIMARY KEY("rule_id","part_id")
);
--> statement-breakpoint
CREATE TABLE "discount_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"category_id" integer,
	"brand_id" integer,
	"base_rate" numeric(5, 2) DEFAULT 0 NOT NULL,
	"tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shop_settings" ALTER COLUMN "company_name" SET DEFAULT '라이더매니아';--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "online_price" numeric(14, 0) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "brand_id" integer;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN "tire_size" text;--> statement-breakpoint
ALTER TABLE "discount_rule_exclusions" ADD CONSTRAINT "discount_rule_exclusions_rule_id_discount_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."discount_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_rule_exclusions" ADD CONSTRAINT "discount_rule_exclusions_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts" ADD CONSTRAINT "parts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discount_rule_exclusions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "banners" ENABLE ROW LEVEL SECURITY;
