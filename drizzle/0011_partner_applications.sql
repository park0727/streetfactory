CREATE TABLE "partner_applications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"company_name" text NOT NULL,
	"biz_no" text,
	"contact_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"memo" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"partner_id" bigint,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_applications" ADD CONSTRAINT "partner_applications_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "partner_applications_status_idx" ON "partner_applications" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "partner_applications" ENABLE ROW LEVEL SECURITY;
