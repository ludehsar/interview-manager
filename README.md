# Remote Jobs & AI Resumes

Aggregates remote jobs from company applicant tracking systems and curated remote
boards (worldwide, APAC, Bangladesh), then builds a master resume with AI agents and
tailors it per job against a knowledge graph of your own experience.

## Stack

| Layer | Choice |
|---|---|
| Web + BFF | Next.js 16 (App Router, React 19) on Vercel |
| Auth | Clerk |
| Data | Neon Postgres with pgvector and pg_trgm, via Drizzle |
| Job search | OpenSearch (Docker locally), with Postgres full-text as fallback |
| LLM | Anthropic API (Opus 5 / Sonnet 5 / Haiku 4.5) |
| Async compute | AWS Lambda, SQS, EventBridge Scheduler, Step Functions |
| CPU-heavy work | Rust Lambdas (Typst PDF rendering, local embeddings) |
| Infrastructure | Terraform |

## Local setup

Everything runs locally against Docker. No cloud account is needed to develop.

```bash
pnpm install
cp .env.example .env
pnpm dev:up        # postgres with pgvector + localstack + opensearch
pnpm db:migrate
pnpm search:init   # create the jobs index and load whatever is already in postgres
pnpm check:local   # verifies postgres, pgvector, s3, both sqs queues and opensearch
pnpm dev
```

Job sources live in `src/adapters/`: applicant tracking systems (Greenhouse, Lever, Ashby,
Workable, SmartRecruiters, Workday, Eightfold), Amazon's own search API, curated remote
boards (Remotive, We Work Remotely, Himalayas, Working Nomads, Jobicy, RemoteOK, Arbeitnow),
`wpjobs` for companies whose careers page is WordPress with a job post type, and
`successfactors` for SAP SuccessFactors career sites. Bangladeshi postings come from `bdjobs`,
which reads Bdjobs.com's public job-search and job-detail APIs for the IT & Telecommunication
category and the IT and Telecommunication industries, alongside Pathao and SELISE via `wpjobs`,
Optimizely's Dhaka roles via `successfactors`, and the Bangladeshi employers that publish
through Workable and SmartRecruiters. `pnpm check:adapters`
probes every one of them live and is the source of truth for whether a board still answers.

The board only shows technical roles. `src/domain/jobs/discipline.ts` classifies every posting
from its title into SOFTWARE, DATA, PRODUCT, DESIGN, IT or OTHER, and the query layer excludes
OTHER — so accounting, sales, HR, admin and non-software engineering never reach the list.

`docker-compose.yml` runs three containers:

| Service | Port | Contents |
|---|---|---|
| `postgres` | 5433 | Postgres 17 with pgvector and pg_trgm preinstalled |
| `localstack` | 4566 | S3 bucket, `ingest` and `embed` queues each with a dead-letter queue, and the three SSM parameters |
| `opensearch` | 9200 | Single-node cluster holding the `jobs` index that powers search, filters and facets |

LocalStack resources are recreated from `docker/localstack/init/` on every start, so
`pnpm dev:reset` gives a clean database and a clean set of AWS mocks.

EventBridge Scheduler is not in LocalStack's free edition, so scheduled ingestion is
triggered by hand locally; everything it calls is a plain queue message.

### Credentials

`.env` is created from `.env.example` and is gitignored. Local defaults point at the
containers and need no editing. Two values are yours to supply:

- `ANTHROPIC_API_KEY` — needed once resume generation is wired up.
- `CLERK_WEBHOOK_SIGNING_SECRET` — needed only to test the user-sync webhook, which you
  can forward locally with `clerk webhooks`.

Clerk development keys are already in `.env`, created by `clerk init --accountless`. That
application is temporary and unclaimed. Run `clerk auth login` to claim it into your own
Clerk account, or replace both keys with ones from an application you create yourself.

### Switching to hosted Postgres

`src/db/client.ts` picks its driver from the hostname in `DATABASE_URL`: `node-postgres`
over TCP for localhost, the Neon HTTP driver for anything else. Point `DATABASE_URL` at a
Neon connection string and nothing else changes. The HTTP driver has no interactive
transactions, so do not write `db.transaction(async tx => ...)` — it works locally and
fails in production.

## Commands

```bash
pnpm dev              # Next.js dev server
pnpm dev:up           # start postgres + localstack + opensearch
pnpm dev:down         # stop them
pnpm dev:reset        # wipe volumes, restart, re-migrate
pnpm check:local      # assert the local stack is reachable
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm test             # vitest
pnpm build            # production build
pnpm db:generate      # generate a Drizzle migration from schema.ts
pnpm db:migrate       # apply migrations
pnpm db:backfill      # recompute location, workplace and discipline on stored rows
pnpm search:init      # create the opensearch index if missing and backfill it from postgres
pnpm search:reindex   # drop and rebuild the index from postgres
pnpm workers:build    # bundle Lambda handlers into dist/workers
pnpm seed:sources     # load src/adapters/sources.ts into job_source_state
pnpm check:adapters   # probe every job source live (--tier A, --kind lever, --save-fixtures)
pnpm sweep            # dispatch + drain the ingest queue against LocalStack
pnpm ingest:dispatch  # enqueue due sources only
pnpm ingest:drain     # run the worker against whatever is queued
cargo lambda build --arm64 --release    # build the Rust Lambdas
```

`pnpm sweep --tier A --force` runs a full ingest: it enqueues every enabled Tier A
source, runs the worker on each message, upserts jobs, deactivates postings the source
stopped listing, and collapses lower-tier duplicates onto the tier A row. Re-running it
is idempotent — row counts and `first_seen_at` do not move.

Jobs are written to Postgres first and mirrored into OpenSearch by the same worker, so
Postgres stays the system of record. `searchJobs`, `countJobs` and `loadFacets` use
OpenSearch when `OPENSEARCH_URL` is set and fall back to the Postgres query on any error,
which means the board keeps working with the container stopped. Unset `OPENSEARCH_URL` to
run entirely on Postgres.

`cargo lambda` needs Zig for cross-compilation (`brew install zig`).

## Documentation

- `docs/architecture.md` — system design, cost model, and the reasoning behind the
  resume-generation pipeline.
- `src/db/README.md` — the raw-SQL indexes Drizzle cannot express.
- `infra/terraform/README.md` — first-time infrastructure setup.
