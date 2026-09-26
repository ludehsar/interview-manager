# 0008. LangGraph.js + Anthropic inside the API

- Status: Proposed
- Date: 2026-09-26

## Context
Resume generation and tailoring are multi-step: parse, draft, critique, revise. They take tens of seconds to minutes, need visible progress, and sometimes need human approval partway through.

## Decision
- **LangGraph.js** graphs run **inside the NestJS API process**, in the `agents` module. There is no separate worker service.
- LLM: **Anthropic API** via `@langchain/anthropic`.
  - Default model for drafting and critique: Claude Sonnet 5 (`claude-sonnet-5`).
  - Cheap extraction and classification steps: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`).
  - Model IDs live in config, not code.
- **Structured output everywhere.** Every node that produces data returns JSON validated by zod schemas from `packages/shared`. If validation fails, the node retries once with the validation error included, then the run fails.
- **Prompt caching** on large stable prefixes (system prompt + the user's profile) to cut cost across nodes.
- **Postgres checkpointer** (`@langchain/langgraph-checkpoint-postgres`): runs survive API restarts or redeploys and can be resumed. It also enables human-in-the-loop via `interrupt()`.
- **Run lifecycle**:
  1. Endpoint creates an `AgentRun` row and starts the graph without awaiting it. Returns `runId`.
  2. Node events stream to clients over SSE (`/v1/runs/:id/events`).
  3. On completion, outputs are persisted as a `ResumeVersion` and the run is marked `succeeded`.
  4. On boot, the API finds `running` runs with no live owner and resumes them from their last checkpoint.
- **Guardrails**:
  - At most one active run per user per graph.
  - Per-run token and cost ceiling.
  - Per-node timeouts.
  - Token usage and cost recorded on `AgentRun`.
- Prompts are versioned files in the `agents` module. The prompt version is stored on each run for traceability.
- Tracing: LangSmith is optional (off by default); structured logs always.

## Consequences
- **Tradeoff accepted**: long runs share CPU, memory and event loop with HTTP traffic. Graphs are I/O-bound (waiting on the LLM), so this is acceptable at MVP scale.
- Redeploys interrupt runs mid-node. The checkpointer bounds lost work to one node.
- If load grows, the `agents` module can move into a separate Railway worker process from the same codebase without changing graph code.

## Open questions
- Concurrency cap per API instance before we need a queue.
