# 0005. NestJS backend API

- Status: Proposed
- Date: 2026-09-26

## Context
A single backend serves web and mobile, owns all data, and hosts the agent graphs (ADR 0008).

## Decision
- **NestJS** (TypeScript) with feature modules by domain:
  - `auth`: Better Auth mount and session guard.
  - `profile`: profile CRUD and profile import (agent-assisted).
  - `resumes`: master and tailored resumes, versions, diff, PDF export.
  - `jobs`: job intake and the application tracker.
  - `agents`: LangGraph graphs, run lifecycle, SSE streams.
  - `prisma`: shared PrismaService.
- REST + JSON. Endpoints are versioned under `/v1`.
- Long operations are **async runs**: `POST` returns `{ runId }`, the client subscribes to `GET /v1/runs/:id/events` (SSE), and `GET /v1/runs/:id` returns the final state.
- Validation at the boundary uses zod schemas from `packages/shared`, via a zod validation pipe.
- Consistent error shape. Authorization checks confirm the user owns every resource.
- PDF rendering happens server-side from the resume JSON with a single template.
- Health endpoint for Railway.

## Consequences
- Agent runs share process resources with request handling (see ADR 0008 for mitigations).
- One source of truth for contracts means the API, web and mobile never drift.

## Open questions
- PDF engine: `@react-pdf/renderer` (no browser) vs headless Chromium (HTML fidelity, heavier image).
