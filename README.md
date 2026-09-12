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
| LLM | Anthropic API (Opus 5 / Sonnet 5 / Haiku 4.5) |
| Async compute | AWS Lambda, SQS, EventBridge Scheduler, Step Functions |
| CPU-heavy work | Rust Lambdas (Typst PDF rendering, local embeddings) |
| Infrastructure | Terraform |

## Local setup

Everything runs locally against Docker. No cloud account is needed to develop.

```bash
pnpm install
cp .env.example .env
pnpm dev:up        # postgres with pgvector + localstack
pnpm db:migrate
pnpm check:local   # verifies postgres, pgvector, s3 and both sqs queues
pnpm dev
```

`docker-compose.yml` runs two containers:

| Service | Port | Contents |
|---|---|---|
| `postgres` | 5433 | Postgres 17 with pgvector and pg_trgm preinstalled |
| `localstack` | 4566 | S3 bucket, `ingest` and `embed` queues each with a dead-letter queue, and the three SSM parameters |

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
pnpm dev:up           # start postgres + localstack
pnpm dev:down         # stop them
pnpm dev:reset        # wipe volumes, restart, re-migrate
pnpm check:local      # assert the local stack is reachable
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm test             # vitest
pnpm build            # production build
pnpm db:generate      # generate a Drizzle migration from schema.ts
pnpm db:migrate       # apply migrations
pnpm workers:build    # bundle Lambda handlers into dist/workers
cargo lambda build --arm64 --release    # build the Rust Lambdas
```

`cargo lambda` needs Zig for cross-compilation (`brew install zig`).

## Documentation

- `docs/architecture.md` — system design, cost model, and the reasoning behind the
  resume-generation pipeline.
- `src/db/README.md` — the raw-SQL indexes Drizzle cannot express.
- `infra/terraform/README.md` — first-time infrastructure setup.
