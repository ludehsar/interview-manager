# Database notes

`jobs.search_vector`, the three `gin_trgm_ops` indexes and the three HNSW vector
indexes are created by the raw SQL migration `0001_search_and_vector_indexes.sql`.
`jobs.sort_at` — the generated `coalesce(posted_at, first_seen_at)` column that the
keyset pagination orders by — and its three partial indexes come from
`0003_jobs_sort_at.sql`. They are intentionally absent from `schema.ts` because
Drizzle cannot express a generated column, a partial index or an HNSW operator class.

`jobs.cities`, `jobs.workplace_type` and their GIN/partial indexes come from
`0004_location_workplace.sql`; only the partial `jobs_workplace_sort_idx` is
invisible to Drizzle there.

`0006_profile_knowledge.sql` adds the `profile_uploads` table, `resume_runs.metrics`,
and two more indexes Drizzle cannot express: `knowledge_chunks_text_fts_idx`
(a GIN index over the `to_tsvector('english', text)` expression, which the hybrid
retrieval in `src/domain/resume/retrieval.ts` needs) and `kg_nodes_label_trgm_idx`
(`gin_trgm_ops` on `normalized_label`).

Consequence: `drizzle-kit push` and `drizzle-kit generate` will propose dropping
them. Never run `push` against a real database, and review every generated
migration for `DROP INDEX` / `DROP COLUMN "search_vector"` before applying it.
