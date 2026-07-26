CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('open', 'locked', 'archived');--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"slot_start_utc" timestamp with time zone NOT NULL,
	"slot_end_utc" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_slots_participant_slot_unique" UNIQUE("participant_id","slot_start_utc","slot_end_utc"),
	CONSTRAINT "availability_slots_range_valid" CHECK ("availability_slots"."slot_start_utc" < "availability_slots"."slot_end_utc")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"edit_key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_id_schedule_id_unique" UNIQUE("id","schedule_id"),
	CONSTRAINT "participants_display_name_not_empty" CHECK (length(trim("participants"."display_name")) > 0),
	CONSTRAINT "participants_edit_key_hash_not_empty" CHECK (length(trim("participants"."edit_key_hash")) > 0)
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"timezone" text NOT NULL,
	"date_range_start" date NOT NULL,
	"date_range_end" date NOT NULL,
	"slot_minutes" integer NOT NULL,
	"daily_windows" jsonb NOT NULL,
	"owner_key_hash" text NOT NULL,
	"status" "schedule_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "schedules_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "schedules_title_not_empty" CHECK (length(trim("schedules"."title")) > 0),
	CONSTRAINT "schedules_public_id_not_empty" CHECK (length(trim("schedules"."public_id")) > 0),
	CONSTRAINT "schedules_timezone_not_empty" CHECK (length(trim("schedules"."timezone")) > 0),
	CONSTRAINT "schedules_owner_key_hash_not_empty" CHECK (length(trim("schedules"."owner_key_hash")) > 0),
	CONSTRAINT "schedules_date_range_valid" CHECK ("schedules"."date_range_start" <= "schedules"."date_range_end"),
	CONSTRAINT "schedules_slot_minutes_supported" CHECK ("schedules"."slot_minutes" IN (15, 30, 60))
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_participant_schedule_fk" FOREIGN KEY ("participant_id","schedule_id") REFERENCES "public"."participants"("id","schedule_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_slots_schedule_slot_idx" ON "availability_slots" USING btree ("schedule_id","slot_start_utc","slot_end_utc");--> statement-breakpoint
CREATE INDEX "availability_slots_participant_id_idx" ON "availability_slots" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "participants_schedule_id_idx" ON "participants" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "schedules_expires_at_idx" ON "schedules" USING btree ("expires_at");
