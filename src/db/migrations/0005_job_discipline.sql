CREATE TYPE "public"."discipline" AS ENUM('SOFTWARE', 'DATA', 'PRODUCT', 'DESIGN', 'IT', 'OTHER');--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "discipline" "discipline" DEFAULT 'OTHER' NOT NULL;--> statement-breakpoint
CREATE INDEX "jobs_discipline_idx" ON "jobs" ("is_active","discipline");--> statement-breakpoint
CREATE INDEX "jobs_discipline_sort_idx" ON "jobs" ("discipline","is_active","sort_at" DESC,"id" DESC)
  WHERE "canonical_job_id" IS NULL;
