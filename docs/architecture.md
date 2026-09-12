# Architecture

## Context

Product: aggregate **remote jobs from reputable sources** (worldwide / APAC / Bangladesh); users build a profile; AI agents generate a **master resume** (Google XYZ + screener rubric) and **tailor** it per job; profile knowledge lives as **embeddings + a typed knowledge graph** so tailoring is grounded and never fabricates. Launch at **≈$0 fixed cost** using free tiers everywhere possible; every component is pay-per-use and swappable by config so it scales without a rewrite. TypeScript by default, **Rust for CPU-heavy pieces**.

Locked decisions: Next.js 16 · Vercel Hobby (web) · Neon Free (Postgres + pgvector) · Clerk Free (auth) · Anthropic API direct (LLM) · AWS Lambda/Step Functions/SQS/S3 via Terraform (all async compute) · **no Turborepo, no monorepo — one package.json**.

Versions at scaffold time: next 16.3.4, react 19.2.8, @clerk/nextjs 7.9.2, drizzle-orm 0.45.2, @anthropic-ai/sdk 0.125.0, @neondatabase/serverless 1.1.0, rust 1.98.1, cargo-lambda 1.9.2.

---

## 1. Free-tier resource map (launch cost ≈ $0/mo + LLM usage)

| Concern | Choice | Free allowance | When it starts costing / scale step |
|---|---|---|---|
| Web + BFF | **Vercel Hobby**, Next.js 16 | 100 GB bandwidth, 1M edge req, serverless fns | Pro $20/mo when commercial; or OpenNext → Lambda+CloudFront (Terraform) |
| Database, vectors, graph, full-text | **Neon Free** (pgvector, pg_trgm) | 0.5 GB, scale-to-zero, PITR 6 h | Neon Launch $19 → Aurora Serverless v2 later; `DATABASE_URL` swap only |
| Auth | **Clerk Free** | 10k MAU | Clerk Pro |
| Async compute | **Lambda arm64** | 1M req + 400k GB-s **always free** | Ingest budget ≈ 300k GB-s/mo → stays free; then $0.0000133/GB-s |
| Orchestration | **Step Functions Standard** | 4k transitions/mo always free (≈400 resume builds) | $0.025/1k after |
| Queues / schedule | **SQS + EventBridge Scheduler** | 1M SQS req, 14M scheduler invocations free | negligible |
| Blobs | **S3** (private, presigned) | 5 GB / 12 mo | ≈ $0.10–0.50/mo after; lifecycle rules keep it small |
| Secrets | **SSM Parameter Store** (standard) | free | — |
| Embeddings | **Self-hosted BGE-small (384-d) in a Rust Lambda** (`fastembed`) | $0, no vendor | Swap to Bedrock Titan v2 / Cohere by config; re-embed = one sweep |
| LLM | **Anthropic API** | none — only real variable cost | See §2 cost table; product quota gates spend |
| Logs / alarms | **CloudWatch** | 5 GB logs, 10 alarms free | 14-day retention |
| CI/CD | **GitHub Actions** | free (public) / 2000 min (private) | — |
| Terraform state | S3 backend, native lockfile | in S3 free tier | — |
| Errors (optional) | Sentry Free | 5k events | — |
| Domain | Vercel DNS | domain ≈ $10/yr (only fixed cost) | — |

Spend guardrail: `llm_calls` table logs every call's tokens/USD; per-user monthly quota (e.g. 1 master + 10 tailorings free) enforced in the BFF; AWS Budget alarm at $5.

---

## 2. LLM model reasoning (the resume-screener question)

| Task | Model | Effort | Why |
|---|---|---|---|
| Master resume draft (once per user) | `claude-opus-5` | `high` | Best writing judgment; one-off, ≈$0.5–1.5 with caching |
| Screener / critic | `claude-opus-5` | `high` | Judge ≥ writer; cross-model judging of Sonnet tailoring avoids same-model blind spots |
| Tailored draft per job | `claude-sonnet-5` | `medium` | $2/$10 per MTok; master + evidence pack cached ⇒ ≈$0.05–0.15 per job |
| Revise loop | same as drafter | `medium` | Local edits, cache hits |
| Extraction / classification (resume PDF → entries, JD parse, location → remote-region, entity+relation extraction, skill tags) | `claude-haiku-4-5` | — | Cents; strict tool schemas keep output valid |
| Nightly bulk tagging | Haiku via **Message Batches** | — | 50% off |

Implementation rules (`src/ai/client.ts`): adaptive thinking on Opus/Sonnet, `output_config.effort` per route, structured outputs via `messages.parse()` with zod schemas, prompt caching ordered rubric → evidence pack → volatile task (test asserts `cache_read_input_tokens > 0`), streaming for drafts, `max_tokens` ≈16k, server-side refusal fallback on Opus 5 (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"` — on by default per Anthropic guidance), usage logged per call. One provider = one cache namespace; a tier map `{reason, write, fast}` swaps models in one place.

Why generator → screener → reviser instead of one call: self-critique inside one context is weak; a separate rubric-scored judge with structured output improves bullets measurably and its JSON becomes the user-facing "why this score" panel.

Frameworks encoded in `src/ai/prompts/`: **Google XYZ** (bullets carry `{x,y,z}` fields, checked mechanically) · **Laszlo Bock rules** (quantify, no unevidenced adjectives) · **Harvard OCS** verb+what+result with a per-role verb taxonomy · **CAR/STAR** for summary + gap-interview questions · **quantification hierarchy** money > % > time > scale > count · **6-second scan** layout rules · **ATS-safe** single column, standard headings, real text, keyword coverage, parse-back check · **anti-fabrication invariant**: every bullet cites `evidence_node_ids[]`; numbers in a bullet ⊆ numbers in cited nodes ∪ answer memory — enforced in code after every LLM step. All entries are kept (multi-page allowed); the section editor lets the user hide, the AI never silently drops.

Embeddings + graph, what they buy: pgvector HNSW over `knowledge_chunks` and `jobs.embedding`; typed graph in `kg_nodes`/`kg_edges` (Person, Role, Company, Project, Skill, Tool, Achievement, Metric, Domain, Education, Cert; edges HELD_ROLE, AT_COMPANY, USED_SKILL, DELIVERED, MEASURED_BY, IN_DOMAIN). Retrieval = hybrid (vector + tsvector) → 1-hop expand (recursive CTE) → evidence pack. Gives JD-requirement → evidence → metric lookup, gap detection (→ interview question), and provenance. Neptune rejected (≈$70+/mo, no free tier, no pgvector join).

---

## 3. Architecture

```
Browser ─► Vercel · Next.js 16 App Router (Clerk via proxy.ts)
            UI · Server Actions/route handlers = BFF · Drizzle → Neon (HTTP driver)
            public /jobs pages statically cached (`use cache`, revalidate on sweep) → SEO traffic for free
            presigned S3 URLs · enqueue work via AWS SDK (Vercel OIDC → IAM role; fallback scoped IAM key)
            ▼
AWS ap-southeast-1 · Terraform · arm64 Lambdas · zero idle cost
 ├─ EventBridge Scheduler (1 h Tier A, 6 h Tier B/C) → Lambda ingest-dispatch → SQS ingest(+DLQ) → Lambda ingest-worker (one source/msg)
 │       → SQS embed → Rust Lambda embed (fastembed BGE-small) → Lambda match (per-user scores) → revalidate hook
 ├─ Step Functions resume-pipeline: extract → kg-build → draft → guard → screen → revise(≤2) → render (Rust/Typst) → ats-score → persist
 ├─ S3 artifacts (uploads/ 30 d · raw-jobs/ 7 d · pdf/ · typst/)
 ├─ SSM params · CloudWatch (14 d) · Budget alarm
Neon Postgres ◄── Vercel + Lambdas          Anthropic API ◄── Lambdas + small interactive BFF calls
Clerk webhooks → /api/webhooks/clerk (user.created / user.deleted → provision / purge)
```
No API Gateway in v1; Lambdas are reached only through Scheduler/SQS/Step Functions. Public surface = Vercel.

### Rust
- `crates/typst-render` — Typst compiler as a library, fonts embedded (OFL: Inter / Source Sans 3), Lambda `provided.al2023` via cargo-lambda. Input: resume JSON + template id → PDF to S3. ~100 ms cold start; no Chromium, no TeX Live.
- `crates/embed` — `fastembed` (ONNX) BGE-small-en-v1.5, 384-d, batch API over SQS. Free, deterministic, fast.
- `crates/resume-score` (phase 5) — keyword/ATS scoring compiled to **WASM** for live score in the editor and reused by the `ats-score` Lambda.

### Data model (Drizzle, single Postgres)
- `users`(clerk_id) · `profiles`(basics, links, `preferences` jsonb: target_titles, seniority, remote_regions, employment_types, salary_min_usd_month) · `profile_entries`(kind EXPERIENCE|PROJECT|EDUCATION|CERT|SKILL_GROUP, data jsonb, sort) · `entry_bullets`(text, x/y/z, metric_status) · `answer_memory`(question, answer, entry_id) — permanent.
- `knowledge_chunks`(user_id, text, embedding vector(384)) · `kg_nodes`(user_id, type, label, props, embedding) · `kg_edges`(src, dst, type, evidence_entry_id). HNSW on embeddings; queries always filter `user_id` and use a keyset.
- `jobs`(id = sha256(kind:identifier:external_id), tier A|B|C, title, company, location_raw, remote_region WORLDWIDE|APAC|BANGLADESH|REGION_LOCKED, employment_type, seniority, role_type, skills text[], salary_min/max_usd_month, description_text, excerpt, apply_url, ats_kind, posted_at, first_seen_at, last_seen_at, is_active, closed_at, fingerprint, embedding vector(384), `search_vector` tsvector GENERATED via raw SQL, not in Drizzle model) · `job_source_state` · `user_jobs`(saved/dismissed/applied) · `job_matches`(user_id, job_id, score, breakdown).
- `resumes`(kind MASTER|TAILORED, job_id, source_resume_id, content jsonb, typst_key, pdf_key, ats_score, screener_report jsonb, prompt_version) · `resume_runs`(execution_arn, step, status, error) · `llm_calls`.
- Indexes: GIN(search_vector), GIN trgm(title), (is_active, posted_at desc), (fingerprint), (source_id, is_active, last_seen_at). Retention: purge closed jobs > 90 d.

### Job sources (v1)
- **Tier A — ATS-direct public JSON** (company posts here first; apply lands in the real ATS): Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee, BambooHR. Seed: curated remote-first/global-hiring companies + Bangladesh companies on these ATSs (verify live: Cefalo, Brain Station 23, Kona, Therap, Vivasoft, WellDev, SELISE, Enosis, Kaz). Big-tech direct: Amazon `amazon.jobs/en/search.json`, Microsoft `gcsservices.careers.microsoft.com/search/api/v1/search`, Google `careers.google.com/api/v3/search/`. Meta (needs a browser) deferred.
- **Tier B — curated remote boards with APIs**: Remotive, Himalayas, Working Nomads, WeWorkRemotely RSS.
- **Tier C — aggregators** (dedupe by fingerprint, ranked lower): Jobicy, RemoteOK (attribution required), Arbeitnow.
- Excluded: LinkedIn/Indeed scraping, bdjobs unofficial API, anything CAPTCHA/login-walled.
- Auto-discovery: apply URLs from B/C matching greenhouse/lever/ashby → proposed Tier A sources (admin toggle).
- `remote_region` classifier: deterministic rules (country lists, "APAC", "UTC+", "worldwide", "US only") → Haiku fallback cached by normalized string.
- `src/adapters/http.ts`: per-host gap, retries, auto-disable after 5 consecutive failures; `scripts/check-adapters.ts` probes every source live.

### Match scoring
`src/domain/jobs/match.ts`: 0–100 blend of cosine(profile centroid, job embedding) + title/skills/remote_region/seniority/salary vs preferences, weights renormalized over components with data. Runs after each sweep (new jobs × users active in 30 d) and after a profile save (that user × active jobs). "Best match" sort joins `job_matches`.

### Resume pipeline (Step Functions Standard)
1. `extract` (Haiku, PDF document block) — only for uploaded resumes.
2. `kg-build` (Haiku, strict schema) — entities/relations, chunks, embeddings; idempotent upsert on (user, type, normalized label).
3. `draft` (Opus 5 master / Sonnet 5 tailored) — evidence pack + rubric → resume JSON (zod; each bullet has `evidence_node_ids`, `xyz`).
4. `guard` (deterministic) — evidence ids exist, numbers ⊆ evidence ∪ answer_memory, all entries present.
5. `screen` (Opus 5 persona) → `{score, per_bullet[], red_flags[], keyword_coverage, edits[]}`.
6. `revise` — apply edits; loop while score < 85 and iterations < 2.
7. `render` (Rust Typst) → PDF + source to S3.
8. `ats-score` — parse PDF text back, headings, keyword coverage.
9. Persist; UI polls `resume_runs`.
Interactive outside the SFN: **gap interview** (Sonnet 5 CAR questions for bullets lacking Y/Z → `answer_memory`) and **section editor** (JSON edit → re-render only).

---

## 4. Repository structure (one package, no monorepo tooling)

```
interview-manager/
├─ package.json · pnpm-lock.yaml · tsconfig.json (paths @/*) · next.config.ts · proxy.ts (Clerk) · drizzle.config.ts · vitest.config.ts · .env.example
├─ src/
│  ├─ app/                (marketing)/ · (app)/jobs, jobs/[id], profile, resumes, resumes/[id] · api/{webhooks/clerk, uploads, resumes, jobs}
│  ├─ components/         ui/ (shadcn) · jobs/ · profile/ · resume/
│  ├─ db/                 schema.ts · client.ts · migrations/ (drizzle-kit + raw SQL for vector/tsvector/indexes)
│  ├─ domain/             jobs/{normalize,fingerprint,salary-usd,remote-region,skills,search,match}.ts · profile/ · resume/{schema,guard,xyz}.ts
│  ├─ ai/                 client.ts (tiers, caching, usage, fallbacks) · prompts/*.md · schemas/*.ts
│  ├─ adapters/           greenhouse.ts, lever.ts, ashby.ts, workable.ts, smartrecruiters.ts, recruitee.ts, bamboohr.ts, amazon.ts, microsoft.ts, google.ts, remotive.ts, himalayas.ts, workingnomads.ts, wwr.ts, jobicy.ts, remoteok.ts, arbeitnow.ts · registry.ts · sources.ts · http.ts
│  ├─ workers/            ingest/{dispatch,worker,match}.ts · resume/{extract,kg-build,draft,guard,screen,revise,ats-score,persist}.ts  (each exports `handler`; bundled by esbuild)
│  └─ aws/                sqs.ts · sfn.ts · s3.ts (thin, used by BFF)
├─ crates/                typst-render/ · embed/ · resume-score/ (later)   (Cargo workspace)
├─ infra/terraform/       modules/{lambda-fn, ingest, resume-pipeline, storage, ssm, vercel-oidc, github-oidc, budget} · envs/{dev,prod} · providers aws + neon + vercel
├─ scripts/               build-workers.ts (esbuild → dist/workers/*.zip) · check-adapters.ts · run-worker-local.ts · seed-sources.ts
└─ .github/workflows/     ci.yml (tsc, vitest, cargo test, tf validate) · deploy.yml (tf plan on PR, apply on main via OIDC; Vercel deploys itself)
```
Next.js 16 notes: `proxy.ts` replaces middleware; Turbopack default; `use cache` for public job pages; React 19.3. Workers share `src/domain`, `src/db`, `src/ai`, `src/adapters` through the same tsconfig paths — esbuild bundles each handler with its imports, so no packages are needed.

---

## 5. Phases (each shippable, each verified)

**Phase 0 — Cleanup + scaffold + infra bootstrap.** §0 deletions · `pnpm create next-app@latest` (TS, App Router, Tailwind, src dir) · Clerk (proxy.ts, sign-in/up, webhook) · Drizzle + Neon + first migration (pgvector, pg_trgm, users, profiles) · Cargo workspace with `typst-render` and `embed` skeletons · Terraform bootstrap (state bucket, GitHub OIDC role, Vercel OIDC role, SSM params, S3 bucket, budget alarm, Neon project via provider, Vercel env vars via provider) · CI green. *Verify:* `terraform apply` on `envs/dev` succeeds; sign in on localhost; `SELECT 1` from Neon in a server component; `cargo lambda build --arm64` for both crates.

**Phase 1 — Jobs.** Adapters + registry + live probe script · ingest dispatch/worker Lambdas + Scheduler + SQS + DLQ · Rust embed Lambda · remote-region classifier · SQL search (FTS + facets + keyset pagination) · web: list, filters, detail, save/dismiss, region tabs, public SEO pages. *Verify:* sweep twice → row count stable, `first_seen_at` unchanged; `EXPLAIN ANALYZE` shows GIN bitmap scan; DLQ empty; Tier C duplicate collapses onto Tier A row; public job page served from cache.

**Phase 2 — Profile + knowledge.** Profile forms, resume upload → Haiku extract → editable entries, `kg-build` Lambda, gap interview with `answer_memory`. *Verify:* real resume round-trips; vector search returns the right chunk for a skill query; interview targets an unquantified bullet and persists the answer.

**Phase 3 — Master resume.** Step Function + step Lambdas, prompts/rubric/screener, guard, Typst template + render Lambda, ats-score, resume page (PDF preview, screener report, section editor). *Verify:* full build on a real profile → PDF with every entry, screener ≥ 85 within 2 loops, `cache_read_input_tokens > 0` on revise, `llm_calls` cost < $2, PDF text parses back with all headings.

**Phase 4 — Tailoring + matching.** JD parse → requirement nodes → hybrid retrieval + 1-hop → Sonnet 5 tailored draft → Opus screener with keyword coverage · match Lambda + "Best match" sort · tailor from job page. *Verify:* guard passes on tailored output; keyword coverage rises vs master; match ordering sane for two test profiles.

**Phase 5 — Hardening.** Rubric-graded eval set (~30 profile/job pairs) in CI · `resume-score` WASM live score · source auto-discovery · alarms/dashboards · deletion webhook end-to-end · Batches for nightly tagging · per-user quota + cost page. *Verify:* eval score tracked; deletion leaves zero rows/objects; budget alarm fires at a test threshold.

---

## 5a. Phase 1 decisions that revise the sections above

- **Page caching (revises §3 line 63).** `use cache` requires app-wide `cacheComponents: true` in Next.js 16, and its default handler is per-instance in-memory, so on Vercel serverless a runtime cache would miss on nearly every request; durable caching there means `'use cache: remote'`, which carries platform fees. Phase 1 uses the previous model: `generateStaticParams` + `export const revalidate = 3600` on `/jobs/[id]`, reads through `unstable_cache` tagged `jobs` and `job:<id>`, and a sweep invalidates by POSTing to `/api/revalidate` (shared secret) which calls `revalidateTag(tag, 'max')`. `unstable_cache` is marked "replaced by `use cache`" in the Next 16 docs — adopting Cache Components is Phase 5 work.
- **Route layout (revises §4 line 121).** Route groups do not namespace URLs, so `(app)/jobs` would collide with the public `/jobs`. The single `/jobs` and `/jobs/[id]` live in `(marketing)`; `(app)` holds `/saved` and `/profile`.
- **Clerk `Show` is a server component** under the `react-server` condition (it awaits `auth()` → `headers()`), so using it in a layout makes every page beneath it dynamic. The site header is a `'use client'` island — same `<Show when="signed-in">` API, no `headers()` read, so the marketing subtree still prerenders.
- **Job identity (clarifies §3 line 85).** `source_id` is `"${kind}:${identifier}"`, so `jobs.id = sha256(kind:identifier:external_id)` and the stored `source_id` share one definition.
- **Ordering key (extends §3 line 87).** `posted_at` is nullable and cannot serve a stable keyset, so `jobs.sort_at` is a generated `coalesce(posted_at, first_seen_at)` column with three partial indexes, created in raw SQL alongside `search_vector`.
- **Dedupe vs identity.** `jobs.fingerprint` is `sha256(normalizedCompany|normalizedTitle)` and deliberately carries no source data, so a Tier C copy hashes to the Tier A original. Collapse only ever demotes a strictly lower tier onto a higher one and never deletes, so sweeps stay idempotent; `/jobs/<collapsed id>` 308s to the canonical row.
- **Embeddings deferred.** Phase 1 search is full-text only. `jobs.embedding` stays null and `jobs_embedding_idx` is inert; the `embed` queue is written to but undrained, and `crates/embed` stays stubbed. Because the match Lambda does not exist yet, the ingest worker calls the revalidate hook directly (revises §3 line 67).
- **Adapters shipped:** Greenhouse, Lever, Ashby, Workable, SmartRecruiters (Tier A), Remotive and WeWorkRemotely (Tier B), Arbeitnow (Tier C). The remaining sources in §3 lines 90-92 are later work. `scripts/check-adapters.ts` is the source of truth for whether a board token resolves; `src/adapters/sources.ts` only lists boards that answered a live probe.
- **Adapters shipped after the Phase 1 batch (revises §3 lines 90-92).** Big tech is pulled from the employer's own careers stack, not a board: `amazon` (`amazon.jobs/en/search.json`), `workday` (the public `wday/cxs/{tenant}/{site}/jobs` API — NVIDIA, Salesforce, Adobe, HPE, PayPal, Workday) and `eightfold` (`/api/apply/v2/jobs` — Netflix). Tier B gained `himalayas` and `workingnomads`; Tier C gained `jobicy` and `remoteok`. RemoteOK's terms require a visible link back to remoteok.com wherever its listings appear.
- **Big tech that has no usable public endpoint**, each verified rather than assumed: Google's `careers.google.com/api/v3/search/` now returns 404; Apple's `jobs.apple.com` search API returns 401; Microsoft moved to an Eightfold tenant (`apply.careers.microsoft.com`) that answers `403 Not authorized for PCSX`; Meta still needs a browser. Microsoft becomes a one-line source entry if that tenant is ever opened up.
- **Workday and Eightfold list payloads omit the description**, so both fetch detail pages for at most 40 postings per sweep. The worker passes the ids that *already have* a description, so each sweep enriches the next batch and the backlog drains instead of stalling. Two upsert columns are therefore coalesced (`description_text`, `location_raw`): a sweep that did not fetch a detail page must not overwrite stored detail with null. Workday's `locationsText` is a summary like `2 Locations` for multi-site roles — it is discarded in favour of the detail `location`, otherwise the region classifier only ever sees `UNKNOWN`.
- **Never trust a per-page total.** Workday returns `total: 0` on every page after the first, so a `fetched >= total` break condition stops pagination at two pages. Every paginating adapter now latches the first positive total it sees.

- **Company logos come from favicon services, keyed by domain.** `/api/company-logo` proxies DuckDuckGo (`icons.duckduckgo.com`) and falls back to Google's favicon endpoint; both 404 honestly on unknown domains, so the route can end on a generated SVG monogram and the `<img>` never breaks. Proxying keeps third-party requests off the viewer's browser and puts one `cache-control` in front of them. Clearbit's logo API was checked and is dead (sunset after the HubSpot acquisition); Remotive publishes `company_logo` URLs but they are hotlink-protected (403), so neither is used. `jobs.company_domain` is resolved in this order: curated `sources.ts` domain, adapter-supplied domain, apply-URL host when it is not an ATS or aggregator, a company name that is itself a domain (`Monday.com`), then a URL in the description **whose domain matches the normalized company name** — that last check is what stops a portfolio link from giving a company someone else's logo. Coverage is 100% of Tier A, ~35% of Tier B and ~5% of Tier C, because aggregator payloads carry no domain; those rows get a monogram. Closing that gap would need a name-to-domain lookup (Wikidata's `P856` filtered to business entities is the credible keyless option) and accepts a false-match risk.

- **`truncateDescription(20000)` is load-bearing**, not cosmetic: `search_vector` weights `description_text` and Postgres caps a `tsvector` at 1 MB.

## 6. Verify during implementation (not blockers)
- Vercel OIDC federation on Hobby (else scoped IAM key in Vercel env).
- Clerk 7 + Next 16 `proxy.ts` wiring exactly as their current docs show.
- Live response shapes of each ATS endpoint (probe script is the source of truth; failures auto-disable).
- `fastembed` ONNX runtime on arm64 Lambda binary size (< 250 MB unzipped) — else x86_64 or Titan v2 fallback.
- BGE-small recall on job↔profile matching after a 50-job eyeball test; swap by config if weak.
