# 0003. Next.js (App Router) web client

- Status: Proposed
- Date: 2026-09-26

## Context
The web app is the primary surface for heavy editing: profile, resume editor, diffs.

## Decision
- **Next.js App Router** with TypeScript.
- The web app is a **client of the NestJS API only**. No direct database or LLM access, and no business logic in route handlers. This keeps web and mobile on the same behavior.
- Server components fetch initial data from the API by forwarding the session cookie. Client components handle interactive editing.
- Agent progress is consumed over SSE from the API (see ADR 0008).
- Request/response types and validation come from `packages/shared`.
- UI: Tailwind + shadcn/ui.
- PDF preview renders the same resume JSON the API uses to produce the PDF.

## Consequences
- Web can't cut corners past the API. Every feature is exposed as an API endpoint that mobile can use too.
- Auth cookies must work across the web and API origins (see ADR 0007).

## Open questions
- Web hosting: Vercel or a Railway service alongside the API? This affects the cookie domain strategy.
