CREATE TYPE "public"."workplace_type" AS ENUM('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "cities" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "workplace_type" "workplace_type" DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
CREATE INDEX "jobs_cities_idx" ON "jobs" USING gin ("cities");--> statement-breakpoint
CREATE INDEX "jobs_workplace_idx" ON "jobs" ("is_active","workplace_type");--> statement-breakpoint
CREATE INDEX "jobs_workplace_sort_idx" ON "jobs" ("workplace_type","is_active","sort_at" DESC,"id" DESC)
  WHERE "canonical_job_id" IS NULL;
