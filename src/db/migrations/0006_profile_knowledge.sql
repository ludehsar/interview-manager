CREATE TYPE "public"."upload_status" AS ENUM('PENDING', 'EXTRACTING', 'EXTRACTED', 'ACCEPTED', 'FAILED');--> statement-breakpoint
CREATE TABLE "profile_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer,
	"s3_key" text NOT NULL,
	"status" "upload_status" DEFAULT 'PENDING' NOT NULL,
	"error" text,
	"extracted" jsonb,
	"entry_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "profile_uploads" ADD CONSTRAINT "profile_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_uploads_user_idx" ON "profile_uploads" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "resume_runs" ADD COLUMN "metrics" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "knowledge_chunks_text_fts_idx" ON "knowledge_chunks" USING gin (to_tsvector('english', "text"));--> statement-breakpoint
CREATE INDEX "kg_nodes_label_trgm_idx" ON "kg_nodes" USING gin ("normalized_label" gin_trgm_ops);
