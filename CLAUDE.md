# Interview Manager

Build a master resume from a structured profile, tailor it to each job with AI agents, and track applications through interviews.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Web**: Next.js (App Router)
- **Mobile**: bare React Native (React Native CLI)
- **API**: NestJS
- **Database**: PostgreSQL + Prisma
- **Auth**: Better Auth (mounted in NestJS)
- **Agents**: LangGraph.js + Anthropic API, running inside the NestJS API
- **Deploy**: Railway (API + Postgres) via Infrastructure as Code (`.railway/railway.ts`)

## Decisions

All architecture and logic decisions live in `docs/decisions/`. Start with `docs/decisions/README.md`. Read the relevant ADR before changing an area, and write a new ADR when a decision changes.

## Project Structure

> Placeholder: to be defined. Proposed skeleton only; nothing below exists yet.

```
interview-manager/
├── apps/
│   ├── web/            Next.js web client
│   ├── mobile/         React Native CLI app
│   └── api/            NestJS API (includes agents module)
├── packages/
│   ├── db/             Prisma schema, migrations, client
│   ├── shared/         zod schemas and types for API contracts and resume JSON
│   └── tsconfig/       shared TypeScript configs
├── docs/
│   └── decisions/      ADRs
├── .railway/
│   └── railway.ts      Railway Infrastructure as Code
├── turbo.json
└── pnpm-workspace.yaml
```

## Commands

TBD once the workspaces exist.

## Conventions

- Web and mobile talk only to the API. No direct DB or LLM access from clients.
- API contracts and the resume JSON shape are defined once in `packages/shared`.
- Agents never add facts that aren't in the user's profile (see ADR 0010).
