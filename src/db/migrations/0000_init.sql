CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."kg_edge_type" AS ENUM('HELD_ROLE', 'AT_COMPANY', 'USED_SKILL', 'DELIVERED', 'MEASURED_BY', 'IN_DOMAIN', 'STUDIED_AT', 'RELATED_TO');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."entry_kind" AS ENUM('EXPERIENCE', 'PROJECT', 'EDUCATION', 'CERTIFICATION', 'SKILL_GROUP');--> statement-breakpoint
CREATE TYPE "public"."metric_status" AS ENUM('QUANTIFIED', 'ESTIMATED', 'MISSING');--> statement-breakpoint
CREATE TYPE "public"."kg_node_type" AS ENUM('PERSON', 'ROLE', 'COMPANY', 'PROJECT', 'SKILL', 'TOOL', 'ACHIEVEMENT', 'METRIC', 'DOMAIN', 'EDUCATION', 'CERTIFICATION');--> statement-breakpoint
CREATE TYPE "public"."remote_region" AS ENUM('WORLDWIDE', 'APAC', 'BANGLADESH', 'REGION_LOCKED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."resume_kind" AS ENUM('MASTER', 'TAILORED');--> statement-breakpoint
CREATE TYPE "public"."role_type" AS ENUM('IC', 'MANAGER', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('RUNNING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."seniority" AS ENUM('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'LEAD', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."source_tier" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."user_job_state" AS ENUM('SAVED', 'DISMISSED', 'APPLIED');--> statement-breakpoint
CREATE TABLE "answer_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_id" text,
	"bullet_id" text,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_bullets" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"x" text,
	"y" text,
	"z" text,
	"metric_status" "metric_status" DEFAULT 'MISSING' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_matches" (
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"score" real NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_matches_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
CREATE TABLE "job_source_state" (
	"source_id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"tier" "source_tier" NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_status" text,
	"last_error" text,
	"last_job_count" integer,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"source_kind" text NOT NULL,
	"tier" "source_tier" NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"company_domain" text,
	"location_raw" text,
	"remote_region" "remote_region" DEFAULT 'UNKNOWN' NOT NULL,
	"countries" text[] DEFAULT '{}'::text[] NOT NULL,
	"employment_type" "employment_type" DEFAULT 'UNKNOWN' NOT NULL,
	"seniority" "seniority" DEFAULT 'UNKNOWN' NOT NULL,
	"role_type" "role_type" DEFAULT 'UNKNOWN' NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"salary_min_usd_month" integer,
	"salary_max_usd_month" integer,
	"salary_raw" text,
	"description_text" text,
	"excerpt" text,
	"apply_url" text NOT NULL,
	"ats_kind" text,
	"posted_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"closed_at" timestamp with time zone,
	"fingerprint" text NOT NULL,
	"embedding" vector(384),
	"embedded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kg_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"type" "kg_edge_type" NOT NULL,
	"evidence_entry_id" text,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kg_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "kg_node_type" NOT NULL,
	"label" text NOT NULL,
	"normalized_label" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entry_id" text,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_id" text,
	"source" text NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(384),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"route" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"usd" double precision DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "entry_kind" NOT NULL,
	"title" text NOT NULL,
	"organization" text,
	"location" text,
	"start_date" text,
	"end_date" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"full_name" text,
	"headline" text,
	"location" text,
	"phone" text,
	"email" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"resume_id" text,
	"kind" "resume_kind" NOT NULL,
	"job_id" text,
	"execution_arn" text,
	"step" text NOT NULL,
	"status" "run_status" DEFAULT 'RUNNING' NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "resume_kind" NOT NULL,
	"job_id" text,
	"source_resume_id" text,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"screener_report" jsonb,
	"screener_score" integer,
	"ats_score" integer,
	"typst_key" text,
	"pdf_key" text,
	"prompt_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_jobs" (
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"state" "user_job_state" NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_jobs_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "answer_memory" ADD CONSTRAINT "answer_memory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_memory" ADD CONSTRAINT "answer_memory_entry_id_profile_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."profile_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_memory" ADD CONSTRAINT "answer_memory_bullet_id_entry_bullets_id_fk" FOREIGN KEY ("bullet_id") REFERENCES "public"."entry_bullets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_bullets" ADD CONSTRAINT "entry_bullets_entry_id_profile_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."profile_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_bullets" ADD CONSTRAINT "entry_bullets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_edges" ADD CONSTRAINT "kg_edges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_edges" ADD CONSTRAINT "kg_edges_source_id_kg_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."kg_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_edges" ADD CONSTRAINT "kg_edges_target_id_kg_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."kg_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_edges" ADD CONSTRAINT "kg_edges_evidence_entry_id_profile_entries_id_fk" FOREIGN KEY ("evidence_entry_id") REFERENCES "public"."profile_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_nodes" ADD CONSTRAINT "kg_nodes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kg_nodes" ADD CONSTRAINT "kg_nodes_entry_id_profile_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."profile_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_entry_id_profile_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."profile_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_entries" ADD CONSTRAINT "profile_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_runs" ADD CONSTRAINT "resume_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_runs" ADD CONSTRAINT "resume_runs_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_jobs" ADD CONSTRAINT "user_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answer_memory_user_idx" ON "answer_memory" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "entry_bullets_entry_idx" ON "entry_bullets" USING btree ("entry_id","sort_order");--> statement-breakpoint
CREATE INDEX "job_matches_user_score_idx" ON "job_matches" USING btree ("user_id","score");--> statement-breakpoint
CREATE INDEX "jobs_active_posted_idx" ON "jobs" USING btree ("is_active","posted_at");--> statement-breakpoint
CREATE INDEX "jobs_fingerprint_idx" ON "jobs" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "jobs_source_seen_idx" ON "jobs" USING btree ("source_id","is_active","last_seen_at");--> statement-breakpoint
CREATE INDEX "jobs_company_idx" ON "jobs" USING btree ("company");--> statement-breakpoint
CREATE UNIQUE INDEX "kg_edges_identity_key" ON "kg_edges" USING btree ("source_id","target_id","type");--> statement-breakpoint
CREATE INDEX "kg_edges_user_source_idx" ON "kg_edges" USING btree ("user_id","source_id");--> statement-breakpoint
CREATE INDEX "kg_edges_user_target_idx" ON "kg_edges" USING btree ("user_id","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kg_nodes_identity_key" ON "kg_nodes" USING btree ("user_id","type","normalized_label");--> statement-breakpoint
CREATE INDEX "kg_nodes_user_type_idx" ON "kg_nodes" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_user_idx" ON "knowledge_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "llm_calls_user_idx" ON "llm_calls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "llm_calls_route_idx" ON "llm_calls" USING btree ("route","created_at");--> statement-breakpoint
CREATE INDEX "profile_entries_user_kind_idx" ON "profile_entries" USING btree ("user_id","kind","sort_order");--> statement-breakpoint
CREATE INDEX "resume_runs_user_idx" ON "resume_runs" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "resumes_user_kind_idx" ON "resumes" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resumes_master_key" ON "resumes" USING btree ("user_id") WHERE kind = 'MASTER';--> statement-breakpoint
CREATE INDEX "user_jobs_state_idx" ON "user_jobs" USING btree ("user_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_last_active_idx" ON "users" USING btree ("last_active_at");