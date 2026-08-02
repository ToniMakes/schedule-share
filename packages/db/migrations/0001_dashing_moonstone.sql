CREATE TYPE "public"."schedule_mode" AS ENUM('availability_grid', 'candidate_poll');--> statement-breakpoint
CREATE TABLE "candidate_time_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"label" text,
	"slot_start_utc" timestamp with time zone NOT NULL,
	"slot_end_utc" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_time_options_schedule_slot_unique" UNIQUE("schedule_id","slot_start_utc","slot_end_utc"),
	CONSTRAINT "candidate_time_options_label_not_empty" CHECK ("candidate_time_options"."label" IS NULL OR length(trim("candidate_time_options"."label")) > 0),
	CONSTRAINT "candidate_time_options_range_valid" CHECK ("candidate_time_options"."slot_start_utc" < "candidate_time_options"."slot_end_utc")
);
--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "schedule_mode" "schedule_mode" DEFAULT 'availability_grid' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidate_time_options" ADD CONSTRAINT "candidate_time_options_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_time_options_schedule_id_idx" ON "candidate_time_options" USING btree ("schedule_id");