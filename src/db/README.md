# Database notes

`jobs.search_vector`, the three `gin_trgm_ops` indexes and the three HNSW vector
indexes are created by the raw SQL migration `0001_search_and_vector_indexes.sql`.
They are intentionally absent from `schema.ts` because Drizzle cannot express a
generated column or an HNSW operator class.

Consequence: `drizzle-kit push` and `drizzle-kit generate` will propose dropping
them. Never run `push` against a real database, and review every generated
migration for `DROP INDEX` / `DROP COLUMN "search_vector"` before applying it.
