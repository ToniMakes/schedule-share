CREATE TYPE "public"."candidate_vote_response" AS ENUM('available', 'maybe', 'unavailable');--> statement-breakpoint
CREATE TABLE "candidate_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"candidate_time_option_id" uuid NOT NULL,
	"response" "candidate_vote_response" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidate_votes_participant_option_unique" UNIQUE("participant_id","candidate_time_option_id")
);
--> statement-breakpoint
ALTER TABLE "candidate_votes" ADD CONSTRAINT "candidate_votes_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_votes" ADD CONSTRAINT "candidate_votes_candidate_time_option_id_candidate_time_options_id_fk" FOREIGN KEY ("candidate_time_option_id") REFERENCES "public"."candidate_time_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_votes" ADD CONSTRAINT "candidate_votes_participant_schedule_fk" FOREIGN KEY ("participant_id","schedule_id") REFERENCES "public"."participants"("id","schedule_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_votes_schedule_id_idx" ON "candidate_votes" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "candidate_votes_participant_id_idx" ON "candidate_votes" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "candidate_votes_candidate_time_option_id_idx" ON "candidate_votes" USING btree ("candidate_time_option_id");