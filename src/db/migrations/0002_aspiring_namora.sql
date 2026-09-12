CREATE TABLE "location_regions" (
	"normalized" text PRIMARY KEY NOT NULL,
	"region" "remote_region" NOT NULL,
	"countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"origin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "canonical_job_id" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "content_hash" text;--> statement-breakpoint
CREATE INDEX "jobs_canonical_idx" ON "jobs" USING btree ("canonical_job_id");--> statement-breakpoint
CREATE INDEX "jobs_facet_idx" ON "jobs" USING btree ("is_active","remote_region","employment_type","seniority");