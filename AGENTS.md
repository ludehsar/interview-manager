<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

No comments in application code. Names and structure carry the meaning; explanations
belong in `docs/` or commit messages.

## Layout

- `src/app` — Next.js 16 App Router. `(marketing)` is public, `(app)` requires auth.
- `src/db` — Drizzle schema, client, migrations. See `src/db/README.md` before
  regenerating migrations; three index sets live only in raw SQL.
- `src/domain` — pure business logic, no framework imports. Shared by web and workers.
- `src/adapters` — one job source per file plus the shared throttled HTTP client.
- `src/ai` — Anthropic client tiers, prompts, zod schemas for every pipeline step.
- `src/workers` — Lambda handlers, bundled by `pnpm workers:build`.
- `crates` — Rust Lambdas (PDF rendering, embeddings), built with `cargo lambda`.
- `infra/terraform` — all AWS resources. Vercel and Neon are provisioned separately.

## Conventions

- Auth: Clerk Core 3. Use `<Show when="signed-in">`, never `<SignedIn>`. The proxy lives
  at `src/proxy.ts` (Next.js 16 renamed `middleware.ts`, and with a `src` directory it
  must sit inside it). It only calls `clerkMiddleware()`; protection is resource-based,
  so guard each page or route with `requireUserId()` from `src/lib/auth.ts`.
  `createRouteMatcher` is deprecated — do not reintroduce it.
- Models: `src/ai/client.ts` owns the tier map. Do not hardcode model ids elsewhere.
- Every LLM call is logged to `llm_calls` with token counts and cost.
- Never run `drizzle-kit push`.
- The database driver is chosen by hostname in `src/db/client.ts`. Neon's HTTP driver has
  no interactive transactions, so `db.transaction(async tx => ...)` passes locally and
  fails in production. Do not use it.
- Local AWS goes through `src/aws/clients.ts`, which honours `AWS_ENDPOINT_URL`. Never
  construct an AWS SDK client directly.
