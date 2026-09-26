# Architecture Decision Records

Each decision lives in its own numbered file. Records are immutable once **Accepted**; to change a decision, write a new ADR that supersedes the old one.

| # | Decision | Status |
|---|---|---|
| [0001](0001-product-scope.md) | Product scope and feature set | Proposed |
| [0002](0002-monorepo-turborepo.md) | Turborepo + pnpm monorepo | Proposed |
| [0003](0003-web-nextjs.md) | Next.js (App Router) web client | Proposed |
| [0004](0004-mobile-react-native-cli.md) | Bare React Native CLI mobile client | Proposed |
| [0005](0005-backend-nestjs.md) | NestJS backend API | Proposed |
| [0006](0006-database-postgres-prisma.md) | PostgreSQL with Prisma | Proposed |
| [0007](0007-auth-better-auth.md) | Better Auth hosted in NestJS | Proposed |
| [0008](0008-agents-langgraph-anthropic.md) | LangGraph.js + Anthropic inside the API | Proposed |
| [0009](0009-master-resume-generation.md) | Master resume generation graph | Proposed |
| [0010](0010-resume-tailoring.md) | Per-job resume tailoring graph | Proposed |
| [0011](0011-deployment-railway.md) | Railway deployment with Infrastructure as Code | Proposed |

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
Why a decision is needed; forces and constraints.

## Decision
What we will do.

## Consequences
What becomes easier, what becomes harder, what we must now handle.

## Open questions
Anything still unresolved.
```
