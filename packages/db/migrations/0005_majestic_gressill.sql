CREATE TYPE "public"."ai_recognition_attempt_status" AS ENUM('started', 'succeeded', 'low_confidence', 'provider_unavailable', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."ai_recognition_credit_source" AS ENUM('free_quota', 'rewarded_ad', 'admin', 'refund');--> statement-breakpoint
CREATE TYPE "public"."rewarded_ad_verification_status" AS ENUM('pending', 'verified', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TABLE "ai_recognition_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"participant_id" uuid,
	"credit_grant_id" uuid NOT NULL,
	"entry_method" text DEFAULT 'image_import' NOT NULL,
	"image_mime_type" text NOT NULL,
	"image_byte_size" integer NOT NULL,
	"model" text NOT NULL,
	"estimated_cost_usd" numeric(10, 6) NOT NULL,
	"status" "ai_recognition_attempt_status" DEFAULT 'started' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_recognition_attempts_entry_method_valid" CHECK ("ai_recognition_attempts"."entry_method" = 'image_import'),
	CONSTRAINT "ai_recognition_attempts_mime_type_not_empty" CHECK (length(trim("ai_recognition_attempts"."image_mime_type")) > 0),
	CONSTRAINT "ai_recognition_attempts_byte_size_positive" CHECK ("ai_recognition_attempts"."image_byte_size" > 0),
	CONSTRAINT "ai_recognition_attempts_model_not_empty" CHECK (length(trim("ai_recognition_attempts"."model")) > 0),
	CONSTRAINT "ai_recognition_attempts_cost_nonnegative" CHECK ("ai_recognition_attempts"."estimated_cost_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_recognition_credit_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id_hash" text NOT NULL,
	"schedule_id" uuid,
	"source" "ai_recognition_credit_source" NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id_hash" text,
	"credits_granted" integer NOT NULL,
	"credits_remaining" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credit_grants_provider_event_unique" UNIQUE("provider","provider_event_id_hash"),
	CONSTRAINT "ai_credit_grants_scope_type_not_empty" CHECK (length(trim("ai_recognition_credit_grants"."scope_type")) > 0),
	CONSTRAINT "ai_credit_grants_scope_id_hash_not_empty" CHECK (length(trim("ai_recognition_credit_grants"."scope_id_hash")) > 0),
	CONSTRAINT "ai_credit_grants_provider_not_empty" CHECK (length(trim("ai_recognition_credit_grants"."provider")) > 0),
	CONSTRAINT "ai_credit_grants_event_hash_not_empty" CHECK ("ai_recognition_credit_grants"."provider_event_id_hash" IS NULL OR length(trim("ai_recognition_credit_grants"."provider_event_id_hash")) > 0),
	CONSTRAINT "ai_credit_grants_positive_credits" CHECK ("ai_recognition_credit_grants"."credits_granted" > 0),
	CONSTRAINT "ai_credit_grants_remaining_valid" CHECK ("ai_recognition_credit_grants"."credits_remaining" >= 0 AND "ai_recognition_credit_grants"."credits_remaining" <= "ai_recognition_credit_grants"."credits_granted")
);
--> statement-breakpoint
CREATE TABLE "rewarded_ad_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"ad_unit_id" text NOT NULL,
	"reward_event_id_hash" text NOT NULL,
	"scope_id_hash" text NOT NULL,
	"verification_status" "rewarded_ad_verification_status" DEFAULT 'pending' NOT NULL,
	"gross_revenue_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rewarded_ad_verifications_event_unique" UNIQUE("provider","ad_unit_id","reward_event_id_hash"),
	CONSTRAINT "rewarded_ad_verifications_provider_not_empty" CHECK (length(trim("rewarded_ad_verifications"."provider")) > 0),
	CONSTRAINT "rewarded_ad_verifications_ad_unit_not_empty" CHECK (length(trim("rewarded_ad_verifications"."ad_unit_id")) > 0),
	CONSTRAINT "rewarded_ad_verifications_event_hash_not_empty" CHECK (length(trim("rewarded_ad_verifications"."reward_event_id_hash")) > 0),
	CONSTRAINT "rewarded_ad_verifications_scope_hash_not_empty" CHECK (length(trim("rewarded_ad_verifications"."scope_id_hash")) > 0),
	CONSTRAINT "rewarded_ad_verifications_revenue_nonnegative" CHECK ("rewarded_ad_verifications"."gross_revenue_usd" IS NULL OR "rewarded_ad_verifications"."gross_revenue_usd" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ai_recognition_attempts" ADD CONSTRAINT "ai_recognition_attempts_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recognition_attempts" ADD CONSTRAINT "ai_recognition_attempts_credit_grant_id_ai_recognition_credit_grants_id_fk" FOREIGN KEY ("credit_grant_id") REFERENCES "public"."ai_recognition_credit_grants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recognition_attempts" ADD CONSTRAINT "ai_recognition_attempts_participant_schedule_fk" FOREIGN KEY ("participant_id","schedule_id") REFERENCES "public"."participants"("id","schedule_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recognition_credit_grants" ADD CONSTRAINT "ai_recognition_credit_grants_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_recognition_attempts_schedule_id_idx" ON "ai_recognition_attempts" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "ai_recognition_attempts_participant_id_idx" ON "ai_recognition_attempts" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "ai_recognition_attempts_credit_grant_id_idx" ON "ai_recognition_attempts" USING btree ("credit_grant_id");--> statement-breakpoint
CREATE INDEX "ai_recognition_attempts_created_at_idx" ON "ai_recognition_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_credit_grants_scope_idx" ON "ai_recognition_credit_grants" USING btree ("scope_type","scope_id_hash");--> statement-breakpoint
CREATE INDEX "ai_credit_grants_schedule_id_idx" ON "ai_recognition_credit_grants" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "ai_credit_grants_expires_at_idx" ON "ai_recognition_credit_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rewarded_ad_verifications_scope_idx" ON "rewarded_ad_verifications" USING btree ("scope_id_hash");--> statement-breakpoint
CREATE INDEX "rewarded_ad_verifications_status_idx" ON "rewarded_ad_verifications" USING btree ("verification_status");