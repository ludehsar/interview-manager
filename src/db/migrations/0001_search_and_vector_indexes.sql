CREATE OR REPLACE FUNCTION text_array_to_string(text[]) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT array_to_string($1, ' ') $$;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce("company", '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(text_array_to_string("skills"), '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce("excerpt", '')), 'C') ||
    setweight(to_tsvector('english'::regconfig, coalesce("description_text", '')), 'D')
  ) STORED;--> statement-breakpoint
CREATE INDEX "jobs_search_idx" ON "jobs" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "jobs_skills_idx" ON "jobs" USING gin ("skills");--> statement-breakpoint
CREATE INDEX "jobs_countries_idx" ON "jobs" USING gin ("countries");--> statement-breakpoint
CREATE INDEX "jobs_title_trgm_idx" ON "jobs" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "jobs_company_trgm_idx" ON "jobs" USING gin ("company" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "jobs_embedding_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "kg_nodes_embedding_idx" ON "kg_nodes" USING hnsw ("embedding" vector_cosine_ops);
