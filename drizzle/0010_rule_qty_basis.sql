ALTER TABLE "discount_rules" ADD COLUMN "qty_basis" text DEFAULT 'total' NOT NULL;--> statement-breakpoint
ALTER TABLE "discount_rules" ADD COLUMN "pick_mode" text DEFAULT 'target' NOT NULL;