# 0006. PostgreSQL with Prisma

- Status: Proposed
- Date: 2026-09-26

## Context
Data is relational (user → profile → resumes → jobs). Resume content is a structured document that's always read and written as a whole.

## Decision
- **PostgreSQL** on Railway.
- **Prisma** ORM. The schema, migrations and generated client live in `packages/db`. Only the API imports it.
- Core entities (first cut):
  - `User`, `Session`, `Account`, `Verification`: owned by Better Auth.
  - `Profile` (1:1 User) with child tables `Experience`, `Project`, `Education`, `Skill`, `Certification`, `Link`. Child tables allow editing and ordering per item.
  - `Resume`: `kind` (`master` | `tailored`), `jobId?`, `currentVersionId`.
  - `ResumeVersion`: immutable snapshot with `content` (JSONB, validated by the shared zod schema), `source` (`agent` | `user`), `agentRunId?`, `createdAt`.
  - `Job`: company, title, JD text, URL, parsed requirements (JSONB), status, dates.
  - `ApplicationEvent`: status transitions, interview rounds, notes.
  - `AgentRun`: graph name, status, input refs, output refs, token usage, cost, error, timestamps.
- LangGraph checkpoint tables are managed by the LangGraph Postgres checkpointer, not Prisma. They sit in a separate schema (`langgraph`) to avoid migration conflicts.
- Migrations: `prisma migrate dev` locally, `prisma migrate deploy` as the API's pre-deploy step on Railway.
- Every user-owned row carries `userId` or is reachable from it. Queries are always scoped by user.

## Consequences
- Resume versions are cheap to diff and roll back, because each one is a full JSON snapshot.
- JSONB content must be validated in the app. Postgres won't enforce its shape.

## Open questions
- Vector search (pgvector) for matching profile items to JD requirements: skip until a plain LLM comparison proves insufficient.
