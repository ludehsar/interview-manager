ALTER TABLE "jobs" ADD COLUMN "sort_at" timestamptz
  GENERATED ALWAYS AS (coalesce("posted_at", "first_seen_at")) STORED;--> statement-breakpoint
CREATE INDEX "jobs_active_sort_idx" ON "jobs" ("is_active", "sort_at" DESC, "id" DESC)
  WHERE "canonical_job_id" IS NULL;--> statement-breakpoint
CREATE INDEX "jobs_region_sort_idx" ON "jobs" ("remote_region", "is_active", "sort_at" DESC, "id" DESC)
  WHERE "canonical_job_id" IS NULL;--> statement-breakpoint
CREATE INDEX "jobs_fingerprint_active_idx" ON "jobs" ("fingerprint", "tier") WHERE "is_active";
