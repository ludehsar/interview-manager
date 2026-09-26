# 0011. Railway deployment with Infrastructure as Code

- Status: Proposed
- Date: 2026-09-26

## Context
The backend (NestJS API with embedded agents) and PostgreSQL need hosting with reproducible, reviewable infrastructure.

Railway's older Config as Code (`railway.json` / `railway.toml`) is **deprecated** and stops being read on 2026-12-01. Its replacement is **Infrastructure as Code**: `.railway/railway.ts`, applied through the Railway CLI.

## Decision
- A single `.railway/railway.ts` at the monorepo root defines the Railway project:
  - `api` service: builds from the repo root with a turbo filter for the API app. Start command runs the built NestJS app. Pre-deploy runs `prisma migrate deploy`. Healthcheck on the health endpoint.
  - `postgres` database. `DATABASE_URL` is referenced into `api`.
  - Environment variables and secret references: `ANTHROPIC_API_KEY`, `BETTER_AUTH_SECRET`, OAuth credentials, email provider key. Values are set in Railway, never committed.
  - Custom domain for the API.
  - Environments: `production`, plus PR preview environments.
- Workflow: `railway config plan` in CI on PRs (shows the diff), `railway config apply` on merge to `main`.
- Watch paths are limited to the API app and the packages it depends on, so web or mobile-only changes don't redeploy the API.
- Web hosting and mobile distribution are out of scope for this ADR.

## Consequences
- The infrastructure is reviewed in PRs like code.
- Anything that can't be expressed in `railway.ts` must be documented here.
- Because agents run in the API (ADR 0008), deploys interrupt in-flight runs. Graceful shutdown should wait briefly for active nodes, and runs resume from checkpoints on boot.

## Open questions
- Replica count: start at 1. More replicas require run ownership and locking for the resume-on-boot logic.
- Railway bucket vs external S3 for stored PDFs, if PDFs are persisted rather than rendered on demand.
