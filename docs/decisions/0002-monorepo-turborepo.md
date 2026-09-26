# 0002. Turborepo + pnpm monorepo

- Status: Proposed
- Date: 2026-09-26

## Context
Three apps (web, mobile, api) share TypeScript types, API contracts and the database schema. They need to be versioned and changed together.

## Decision
- One repo managed by **Turborepo** on **pnpm workspaces**.
- Top-level layout: `apps/*` for deployables and `packages/*` for shared code. The exact tree is defined in `CLAUDE.md`.
- Shared packages (kept minimal; add more only when needed):
  - `db`: Prisma schema, migrations, generated client (API only).
  - `shared`: zod schemas and TypeScript types for API contracts and the resume JSON shape. Used by all three apps.
  - `tsconfig`: base TypeScript configs.
- Turbo tasks: `dev`, `build`, `lint`, `typecheck`, `test`. `build` depends on `^build`. Outputs are cached.
- One lockfile at the root. Node version pinned via `.nvmrc` / `engines`.

## Consequences
- Contract changes break all consumers at compile time. That's the point.
- React Native's Metro bundler needs extra config to resolve pnpm's symlinked workspace packages (see ADR 0004).
- Railway builds the API from the monorepo root using a turbo filter (see ADR 0011).

## Open questions
- Remote caching (Vercel Remote Cache or self-hosted): only if CI time becomes a problem.
