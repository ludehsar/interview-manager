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

- **Structured location (extends §3 line 85).** `remote_region` answers "can I apply from here", not "where is this job", so it cannot serve a location filter. `jobs.cities text[]` and `jobs.countries text[]` are resolved from `location_raw` by `domain/jobs/location.ts` against the alias tables in `domain/jobs/geo.ts` (all 64 Bangladeshi districts with their Dhaka and Chattogram neighbourhoods, ~130 global hubs, ~80 countries, US states and Canadian provinces). One filter covers both granularities: the `loc` query param carries tokens of the form `city:dhaka` / `country:BD`, and the SQL `or`s `cities &&` against `countries &&` so a city and a country selected together widen rather than narrow. Multi-location postings keep every match, which is why both columns are arrays and both are GIN-indexed. `remote_region` is now derived from the resolved countries when the rule/LLM classifier returns `UNKNOWN`, which is what puts Bdjobs postings in the Bangladesh tab.
- **Workplace is orthogonal to region.** `jobs.workplace_type` (REMOTE | HYBRID | ONSITE | UNKNOWN) is inferred in this order: an adapter-supplied hint (Bdjobs publishes `WorkPlace`), then hybrid/remote/onsite wording in `location_raw`, then ONSITE when a city resolved and nothing said otherwise. Hybrid is checked before remote so "Home Or Office" does not read as remote. `scripts/backfill-locations.ts` recomputes all four columns for rows ingested before the migration.
- **OpenSearch serves the board; Postgres stays the system of record.** The ingest worker upserts to Postgres and then mirrors the same rows into the `jobs` index in one bulk call, deleting the ones it just deactivated or collapsed, so the index never outlives a posting. `searchJobs`/`countJobs`/`loadFacets` use the index when `OPENSEARCH_URL` is set and fall back to the SQL path on any error — the board keeps working with the container stopped, and unsetting the variable runs entirely on Postgres. The cursor format is shared: `search_after` takes `[sortAt, id]`, or `[_score, sortAt, id]` for relevance, from the same base64 cursor the SQL keyset uses. Facets are one request — a `global` + `filter` aggregation per dimension reproduces the SQL `skip` semantics, where each facet counts against every filter except its own. `src/search/client.ts` is a plain `fetch` client rather than `@opensearch-project/opensearch` so that the AWS-hosted deployment can add SigV4 signing in one place without a second transport.
- **Bangladeshi jobs come from Bdjobs, not from company career pages.** Probing the career sites of the largest Bangladeshi employers (bKash, Grameenphone, Robi, Pathao, Chaldal, Therap, Cefalo, Kaz, Nagad) found bespoke pages with no machine-readable feed on all but a handful; only ShopUp (SmartRecruiters) and Dynamic Solution Innovators (Workable) added to the existing Workable seeds. Those same employers post to Bdjobs, whose Angular front end is backed by two unauthenticated JSON endpoints on `gateway.bdjobs.com` — `JobSearch/GetJobSearch` (paginated, filterable by `category`, `location`, `industry`, `keyword`) and `JobSubsystem/jobDetails`. That host's `robots.txt` allows all agents, unlike `www.bdjobs.com` which disallows everything outside a crawler whitelist. Salary arrives as structured monthly BDT, `WorkPlace` as an explicit workplace hint, and both `category` and `location` ids are positional (IT/Telecommunication is 8, Dhaka is 14). The seeds pin categories only, because `jobs.id` hashes the source identifier and `collapseDuplicates` demotes only a *strictly lower* tier: two same-tier Bdjobs feeds that overlap would both stay visible. Categories are disjoint, a district feed is not, so district feeds stay available in the adapter (`location:<id>`) but unseeded.

- **The board is scoped to technical roles (`jobs.discipline`).** Bdjobs and the big aggregators carry every profession, so a title classifier in `domain/jobs/discipline.ts` buckets each posting into SOFTWARE, DATA, PRODUCT, DESIGN, IT or OTHER and both query paths gate on the five technical values. The order matters: strong software signals are matched first so `Billing Systems Engineer` and `Sales Engineering Manager` stay, then non-technical fields and roles are excluded, then weak signals, then a two-skill floor. `NON_TECH_FIELD` matches the discipline word anywhere in the title rather than only before the role noun, because Bdjobs writes `Site Engineer-Civil`. On the 9,939 rows in the local database this keeps 5,860 and drops 3,996; over-inclusion is deliberate, since a stray `Community Developer` is cheaper than a missing backend role. Non-English titles are the known gap — a French cybersecurity role classifies as OTHER.
- **Adding company sources is probe-first, and the slug is never trusted.** `recruitee.com/google` serves one posting called `Senior Marketer (Sample)`, `smartrecruiters.com/uber` serves one called `Test UAT`, and `greenhouse.io/wise` serves US sales agents for an unrelated company — all three answer 200. Every seed added here was confirmed by reading the payload back: Agoda (291), Airbnb (164), Datadog (446), Snowflake (368), Canva and Grab. Google's `careers.google.com/api/v3/search` still 404s, Atlassian's listing endpoint now 401s, Microsoft's host does not resolve, and Meta still needs a browser, so none of them are seeded.
- **Overlapping feeds from one board need a shared identity (`SourceDefinition.identityKey`).** `jobs.id` hashes `kind:identifier:externalId`, and `collapseDuplicates` only ever demotes a *strictly lower* tier, so two same-tier feeds that both list a posting produce two visible rows. Bdjobs categories are disjoint but its industries are not — an IT-category role at an IT-industry company appears in `category:8`, `industry:11` and `industry:12` alike. Those seeds therefore declare `identityKey: 'bdjobs'`, so all three feeds hash to the same row and the second feed upserts instead of duplicating. `sourceId` is not in `UPSERT_SET`, so the row keeps whichever feed saw it first and `deactivateStale` stays scoped to that feed.
- **Bangladeshi employers run WordPress, not an ATS.** Probing 30 of the largest across seven ATS platforms turned up exactly one standard board (ShopUp on SmartRecruiters). Two run WordPress job plugins with the REST API open — Pathao (`awsm_job_openings`, the wp-job-openings plugin) and SELISE (`job`) — which is what the `wpjobs` adapter reads, keyed by `host|postType`. Those posts carry no location metadata, so the source declares `locationDefault` and `countryHint` instead. bKash returns 403 to any non-browser client, Enosis Solutions' own site sits behind the same Cloudflare block (its real channel is the Workable account already seeded, currently empty), and Nagad's careers page is server-rendered HTML with no feed; all of them post to Bdjobs, which the category and industry feeds cover.
- **SuccessFactors career sites are scraped from the search table, not an API.** Optimizely (which staffs a Dhaka office) runs SAP SuccessFactors at `careers.optimizely.com`; there is no JSON endpoint and the job pages carry no JSON-LD, but the Career Site Builder search results are a stable `<tr class="data-row">` table with `jobTitle-link`, `jobLocation` and `jobDate`, paginated 25 at a time by `?startrow=`. The adapter reads that, then fetches at most 40 job pages per sweep for the `jobdescription` block, reusing the same already-described-ids trick as Workday and Eightfold. Samsung, by contrast, exposes a plain Workday tenant (`sec.wd3.myworkdayjobs.com/Samsung_Careers`, 692 postings), so it is a one-line seed on the existing adapter.

## 6. Verify during implementation (not blockers)
- Vercel OIDC federation on Hobby (else scoped IAM key in Vercel env).
- Clerk 7 + Next 16 `proxy.ts` wiring exactly as their current docs show.
- Live response shapes of each ATS endpoint (probe script is the source of truth; failures auto-disable).
- `fastembed` ONNX runtime on arm64 Lambda binary size (< 250 MB unzipped) — else x86_64 or Titan v2 fallback.
- BGE-small recall on job↔profile matching after a 50-job eyeball test; swap by config if weak.

## 5b. Phase 2 decisions that revise the sections above

- **The schema was already complete (revises §5 Phase 2/3).** Every table Phase 2 and Phase 3 need —
  `profiles`, `profile_entries`, `entry_bullets`, `answer_memory`, `knowledge_chunks`, `kg_nodes`,
  `kg_edges`, `resumes`, `resume_runs`, `llm_calls` — shipped in `0000_init.sql`, with the HNSW
  `vector_cosine_ops` indexes in `0001`. Phase 2 needed exactly one migration,
  `0006_profile_knowledge.sql`.
- **Deployed Lambdas could not reach Neon or Anthropic.** `envs/dev` passed `SSM_PREFIX` and the
  ingest module granted `ssm:GetParameter*`, but nothing in `src/` ever read SSM and `DATABASE_URL`
  was not in `lambda_environment`, so the deployed `ingest-worker` could not open a connection.
  `src/aws/ssm.ts` + `ensureSecrets()` at the top of every handler closes this. Any new worker must
  call `ensureSecrets()` before it touches `db()`.
- **`output_config.effort` is not sent on the `fast` tier.** `claude-haiku-4-5` rejects it, and
  extract, kg-build and the gap-interview quantifier are all Haiku. `generateStructured` now omits
  `effort` when `tier === 'fast'`. `pnpm probe:ai fast reason` is the one-command check.
- **Uploads get their own table, not `resume_runs` (revises §3 line 86).** `resume_runs.kind` is the
  `resume_kind` enum (MASTER|TAILORED) and has nowhere to put an S3 key or a filename.
  `profile_uploads` carries `s3_key`, `status`, the raw `extracted` payload and `entry_ids` — the
  last is what makes accepting an extraction idempotent and undoable, since re-accepting deletes the
  entries the previous accept created. `resume_runs` also gained `metrics jsonb` for the UI.
- **Prompts are `.ts`, not `.md` (revises §4 line 126).** `scripts/build-workers.ts` runs esbuild with
  no `.md` loader, so prompts export frozen template strings from `src/ai/prompts/*.ts`.
- **The resume PDF goes to Haiku as a base64 document block, not via the Files API.** The browser
  PUTs to a presigned `uploads/{userId}/{uploadId}.pdf`; the extract step `GetObject`s it and sends
  one `document` block ahead of the text block. The Files API would be a second store with its own
  deletion obligation against Phase 5's "deletion leaves zero rows/objects", and S3 already has the
  30-day lifecycle and CORS. Never set `citations` on that block — citations plus structured outputs
  is an HTTP 400. Grounding comes from the guard, not from citations. PDF only in v1.
- **Two more indexes live only in raw SQL (extends §3 line 87).** `knowledge_chunks_text_fts_idx`
  (GIN over `to_tsvector('english', text)`) is what the FTS half of hybrid retrieval needs, and
  `kg_nodes_label_trgm_idx` is `gin_trgm_ops` on `normalized_label`. Drizzle can express neither and
  will propose dropping both.
- **Retrieval is reciprocal-rank fusion, k=60 (implements §2).** `src/domain/resume/retrieval.ts`
  fuses a 40-candidate vector ranking with a 40-candidate `websearch_to_tsquery` ranking in one
  statement, then expands one hop over `kg_edges` in both directions with a depth-bounded recursive
  CTE. When no embedding is available the vector CTE degrades to empty and the query is pure FTS, so
  search keeps working before the model is built.
- **Embeddings are baked into the binary, int8-quantized (revises §1 and §5a line 162).**
  `crates/embed` uses `fastembed` with a `UserDefinedEmbeddingModel` over `include_bytes!` weights,
  so it never contacts HuggingFace at runtime. The quantized `model_quantized.onnx` is ~33 MB against
  ~133 MB for fp32; fp32 would still fit the 250 MB unzipped cap but would push the zip past the
  50 MB direct-upload limit. `scripts/fetch-assets.sh` pulls the weights and the Inter faces with
  pinned sha256s into gitignored paths.
- **fastembed must be built without its default features.** `default` pulls `hf-hub-native-tls`,
  which drags in `openssl-sys` and fails to cross-compile; `image-models` is dead weight. The crate
  uses `default-features = false, features = ["ort-download-binaries-rustls-tls"]`.
- **Statically linking the ONNX Runtime into a `provided.al2023` zip does not work.** Three walls, in
  order: `cargo lambda build --arm64` fails because ORT is C++ and its prebuilt static archive needs
  GNU libstdc++ while Zig ships libc++, so lld cannot resolve `std::__cxx11::*`; a Debian bookworm
  container fails because GCC 12 lacks `_M_replace_cold`, which the archive requires (GCC 13+); and a
  Debian trixie container links successfully but produces an artifact needing `GLIBC_2.38` and
  `GLIBCXX_3.4.31`, whereas Lambda's `provided.al2023` ships glibc 2.34 and GLIBCXX 3.4.29 — it would
  build clean and then fail at runtime. `-static-libstdc++` does not rescue this, because the glibc
  floor is set by the build image regardless. Verify any candidate artifact with
  `readelf -V bootstrap | grep -oE 'GLIBC_[0-9.]+|GLIBCXX_[0-9.]+' | sort -uV | tail`, not by whether
  the build succeeded.
  The deployable shape is `ort`'s `load-dynamic` feature: ship the official `libonnxruntime.so`
  (20 MB, itself built against glibc 2.27 / GLIBCXX 3.4.21) next to the binary, point `ORT_DYLIB_PATH`
  at `/var/task/lib/libonnxruntime.so`, and build in an Amazon Linux 2023 container so the glibc floor
  matches the runtime. The resulting `bootstrap` needs only GLIBC_2.34 and no libstdc++ at all, because
  no C++ is statically linked into it any more. 58 MB unzipped, 33 MB zipped — inside both the 250 MB
  and the 50 MB direct-upload limits. Verified by running the same code in an `amazonlinux:2023`
  container: it returns the same cosines as the macOS build (0.747 related, 0.346 unrelated).
  `scripts/build-crates-lambda.sh` is that build, and `pnpm crates:build` runs it.
- **Which ORT the crate links is a Cargo feature.** `bundled` (the default) uses
  `ort/download-binaries` so `cargo test`, `cargo build` and the local `embed-cli` work with no extra
  setup; `dynamic` switches to `load-dynamic` for the Lambda artifact. The container build passes
  `--no-default-features --features dynamic`. Keep the default as `bundled` — making `dynamic` the
  default would break every local `cargo test` with a missing-dylib error.
- **Compute and persistence are split in the embed path (extends §3 line 67).** The Rust Lambda is
  pure — texts in, vectors out — and a TypeScript `ingest/embed-worker` drains the embed queue, loads
  the rows, invokes it and writes the vectors back. That keeps all Postgres knowledge in `src/db`
  instead of duplicating the schema in Rust. `EMBEDDING_PROVIDER` selects `cli` (spawns
  `embed-cli`, the local dev path), `lambda`, or `stub` (deterministic hashed unit vectors, so CI and
  unit tests never need the model). The embed queue finally has a consumer.
- **`embedMessageSchema` is a discriminated union.** Phase 1 wrote `{v:1, jobIds}` messages to the
  embed queue and never drained them; those still parse alongside the new
  `{v:2, userId, target, ids}`, and the worker skips the legacy ones rather than failing the batch.
- **`kg-build` is one Haiku call per `profile_entries` row** — cheap, parallelizable and idempotent
  per entry. Nodes are upserted on the existing `kg_nodes_identity_key (user_id, type,
  normalized_label)`, so edges are addressed by `TYPE:normalized label` rather than by the model's
  invented keys. An entry's chunks are replaced wholesale, so re-running is clean.

- **The one-hop walk unions the edge table, not the recursive term.** Postgres allows exactly one
  reference to a `WITH RECURSIVE` term in its recursive branch; joining `walk` once per edge direction
  parses in Drizzle and fails at runtime with `42P19`, which no SQL-text test can see. `expandOneHopQuery`
  now builds an `undirected(from_id, to_id)` CTE — every edge in both directions — and the recursive
  branch joins `walk` once. `buildEvidencePack` calls this on every resume build, so the bug reached
  Phase 3 too.
- **`pnpm check:retrieval` verifies hybrid retrieval with no LLM spend.** It seeds three entries with
  bullets, chunks and embeds them through the local `embed-cli`, upserts a four-node graph, then asserts
  the RRF ranking returns the right chunk for three skill queries, the node vector search finds
  `Kubernetes` for "container orchestration", the one-hop walk reaches all four nodes, and the evidence
  pack contains every seeded entry — the Phase 2 "vector search returns the right chunk" check. Seeded
  rows are deleted in a `finally`; `--keep` leaves them for inspection and `--user` targets a specific
  user.

- **Accepting an extraction fills the profile basics that are still blank.** The extract already returns
  name, headline, location, email, phone and links, but nothing wrote them anywhere, so a freshly-uploaded
  profile produced a resume with an empty header. `acceptExtraction` now fills only the fields the user has
  left empty — never overwriting something they typed — and returns `basicsFilled` so the toast can say so.
- **A bare count is a metric; a hedge has to be a whole word.** `deriveMetricStatus` only recognised a
  number with a unit, so "covered 140 services across 9 teams" read as `MISSING` and the answered bullet
  went straight back into the gap queue — the interview loop could never close. `COUNT` matches a number
  followed by a word, excluding a standalone 1900-2099 year so "shipped in 2021" still reads as no figure.
  Separately `HEDGE` had no word boundaries, so "c**over**ed" and "dis**cover**ed" matched `over` and
  downgraded a hard number to `ESTIMATED`.
- **One entry cannot fail the whole knowledge graph.** `buildKnowledgeGraph` ran the per-entry Haiku calls
  in a bare loop, so a single unparseable response aborted the build and left the profile half-graphed. Each
  entry is now caught, recorded in `failed[]`, and still chunked from its own text so retrieval keeps working;
  the run throws only when every entry fails. Node labels are bounded by `boundedLabel` at both the identity
  key and the insert, because truncating in only one of the two silently drops every edge on that node.

## 5c. Phase 3 decisions that revise the sections above

- **The drafter never writes a fact it could get wrong.** `ResumeDraftSchema` (`src/ai/schemas/draft.ts`)
  is deliberately smaller than `ResumeDocumentSchema`: the model returns a headline, a summary, section
  order, and per entry a list of bullets keyed by `entryId` and `sourceBulletId`. Titles, organisations,
  locations, dates and contact details are copied from the evidence pack by `materializeDocument`
  (`src/domain/resume/document.ts`), so `ENTRY_INVENTED`, `ORG_INVENTED` and `CONTACT_MISMATCH` are
  unreachable rather than merely detected, and the draft costs fewer output tokens.
- **Ids are derived, not generated.** `res_<sourceBulletId>`, `res_<entryId>`, `sec_<heading>`, with
  `res_<entryId>_n<i>` for a bullet the model wrote from the graph rather than from a profile bullet.
  A screener note and a reviser edit from loop 1 still address the same bullet in loop 2, which is what
  makes the revise loop converge instead of drifting. An entry the pack does not contain is dropped, and
  an entry listed in two sections is placed once.
- **`metricStatus` is derived by `deriveMetricStatus`, not by the model** — the same function the profile
  editor uses, so the guard's `XYZ_INCOMPLETE` check tests the text, not the model's opinion of it.
- **The screener does not decide the score.** Weights live in `src/domain/resume/rubric.ts`; the model
  scores each criterion 0-100 with a comment and `scoreFromRubric` computes the weighted total that the
  `ScoreReached` choice state gates on. A model cannot talk its own resume past the gate, and the panel
  the user reads carries the weight next to each criterion.
- **Repair and revise are the same Lambda but not the same call (implements §5 Phase 3).** A guard
  failure re-drafts in full with the violations appended to the task, because an edit op cannot add back
  a `BULLET_DROPPED` or `ENTRY_DROPPED`. A screener failure returns edits. Both paths increment `$.loop`,
  so the two `MaxRevisions` guards in the ASL share one budget.
- **Every edit is re-guarded before it is stored.** The ASL goes `Revise → Screen` with no guard in
  between, so `applySafeEdits` (`src/domain/resume/revise.ts`) applies the batch, and when the guard gets
  worse falls back to applying edits one at a time, keeping only those that do not raise the error count.
  A rejected edit is counted in `resume_runs.metrics.editsRejected`, not silently dropped.
- **All three reasoning steps share one cache prefix (implements §2).** `stableSystem` is `RUBRIC_BLOCK`
  and nothing else, `cachedContext` is the serialized evidence pack at a 1h TTL, and the step's role text
  moved into the volatile user turn. Anthropic caching is prefix-based, so a per-step system block would
  have given each route its own cache and lost the pack's tokens on every call; with an identical prefix,
  screen and revise read the cache the draft wrote.
- **`runPipeline` mirrors the state machine for local runs.** `src/domain/resume/pipeline.ts` runs the
  same steps in the same order with the same loop bounds, so `pnpm resume:build --user usr_...` builds a
  resume with no AWS at all; `--from draft|screen|render` skips ahead against an existing master resume,
  and `--dry` still just prints the evidence pack.
- **`buildMasterResume` fails the run when `RESUME_STATE_MACHINE_ARN` is unset** instead of leaving a
  queued row the UI polls forever. A server action is the wrong place to run a multi-minute Opus pipeline,
  so local builds go through `pnpm resume:build`.
- **Render is two Lambdas, not one (extends the embed split of §5b).** The ASL's `Render` state passed
  `"content.$": "$.content"` to the Rust function, but the pipeline state has never carried the document —
  it lives in `resumes.content`, and putting a whole resume on the state would spend the Step Functions
  payload budget on every transition. `resume-render` (TypeScript) reads the row, invokes the pure
  `typst-render` function through `RENDER_FUNCTION_ARN`, and writes the keys back, so all Postgres
  knowledge stays in `src/db`. Only `resume-render` is in the state machine's invoke policy.
- **The ATS report is stored, not recomputed.** Scoring it needs the rendered PDF's text layer, so the
  page cannot rebuild it the way it rebuilds the guard report from the evidence pack. `0007_ats_report.sql`
  adds `resumes.ats_report jsonb` beside `screener_report`, and `atsScoreStep` writes the headings,
  coverage and round-trip detail the ATS tab shows.
- **`pnpm check:render` verifies the template with no LLM spend.** It renders a document through the local
  `typst-cli`, reads the PDF back out of S3, and scores the parse-back — the Phase 3 "PDF text parses back
  with all headings" check, runnable on the built-in fixture (`pnpm check:render`) or on a stored resume
  (`--user usr_… --resume res_…`). Template changes are verified this way before any Opus call.
- **A model's string maxima are a hint, not a contract (revises §4).** `output_config.format` carries the
  zod schema's `maxLength`, but the model overruns it: Opus wrote past `comment.max(400)` on nearly every
  screen, and Haiku past `label.max(120)` on kg-build. `beta.messages.parse` turns that into a thrown
  `too_big` and the whole run dies, discarding output already paid for. `generateStructured` now calls
  `beta.messages.create`, parses the JSON itself, and `clampOversized` truncates exactly the paths zod
  reports as `too_big` — strings sliced, arrays trimmed — retrying at most three times and rethrowing
  anything clamping cannot fix. Transforms are not an option: `betaZodOutputFormat` rejects them with
  "Transforms cannot be represented in JSON Schema".
- **Model pricing is keyed on the id the API returns, which is dated.** `MODELS.fast` is `claude-haiku-4-5`
  but the response says `claude-haiku-4-5-20251001`, so the pricing lookup missed and every Haiku call —
  extract, kg-build, the interview quantifier — was recorded in `llm_calls` at $0. `rateForModel` falls back
  to the id with the `-YYYYMMDD` suffix stripped and warns once for a model it still cannot price, so the
  Phase 3 cost gate is measuring real money.
- **Derived ids do not fit a 40-character bound.** `res_<entryId>_n<i>` is 43 characters against a real
  `ent_` id, so the first bullet the drafter wrote from the graph rather than from a profile bullet failed
  `ResumeDocumentSchema`. Document ids now use `resumeIdSchema` (64), shared with the edit and screener note
  schemas that have to address them; the fixtures used short ids, which is why no test caught it.
- **The screener must be told what is scaffolding.** `serializeResume` gives it `[res_blt_…]` tokens,
  `x:/y:/z:` decomposition lines and `evidence:` lines so notes and edits can address a bullet, but nothing
  said these are not on the printed page. Opus scored them: ATS format 55 ("orphaned x:/y:/z: fragments plus
  a [res_blt_…] token a parser will ingest"), six-second scan 72 — points the reviser cannot win back, which
  is why the score plateaued. `SCREEN_ROLE` now names each scaffold line and says to judge layout, scan and
  ATS format on the printed page only. It is in the volatile user turn, so the shared cache prefix is intact.
- **The extract step is told today's date, and does not judge dates at all.** Haiku's sense of "now" predates
  the resume it is reading, so it flagged 04/2026, 01-07/2026 and 11-12/2025 as future dates on a resume read
  in September 2026. `extractTask(today)` states the real date in the volatile user turn — never in the cached
  `EXTRACT_SYSTEM` block, which would invalidate the prefix every day — and the system prompt now forbids any
  warning about a date being past or future. Merely stating the date was not enough on its own: the model kept
  the topic and produced a different kind of noise ("dates are in past but close to reference date; verify"),
  and still mislabelled a start date as an end date. `dateWarnings` in `src/domain/profile/date-warnings.ts`
  replaces all of it — a future start or end, an end before its start, and a current role that also carries an
  end date, compared in whole months with a bare year treated as the whole year. Same rule as `metricStatus`:
  derived in code, not asked of the model.
- **The bullet editor derives XYZ and the metric status while you type.** `metricStatus` is free and instant —
  `deriveMetricStatus` is pure, so the editor runs the same function the server runs on save and shows the badge
  live; the two can never disagree. The X/Y/Z split is a language problem, so it is one Haiku call
  (`resume.decompose`, ~$0.0008, ~2 s) debounced 700 ms after typing stops. It only fires when the text actually
  changed, when it is at least `MIN_DECOMPOSE_CHARS` long, and when at least one field is still auto-owned — a
  field the user has typed into is never overwritten, and when all three are hand-written no call is made at all.
  `MIN_DECOMPOSE_CHARS` lives in `xyz.ts`, not `decompose.ts`: the editor is a client component, and importing
  the module that pulls in `@/ai/client` puts the Anthropic SDK in the browser bundle and fails the build on
  `dns`/`fs`/`net`.
- **OpenSearch is a Terraform module but is off by default (revises §1).** `modules/search` builds a managed
  domain, but a `t3.small.search` costs $0.056/hr in `ap-southeast-1` — about $41/month against a $5 budget
  alarm and the "≈$0 fixed cost" goal, so `opensearch_enabled` defaults to `false` and `searchJobs` keeps
  falling back to the Postgres query. With the flag off the plan is a clean no-op: `lambda_environment` uses
  `merge()` to add `OPENSEARCH_INDEX` only when the module exists, rather than setting it to an empty string.
- **The domain uses fine-grained access control, not SigV4.** `src/search/client.ts` signs nothing — it sends
  HTTP Basic auth — so the domain enables `advanced_security_options` with an internal user database and an
  open access policy, which is the combination AWS requires authentication to come from FGAC. That in turn
  forces `encrypt_at_rest`, `node_to_node_encryption` and `enforce_https`, all of which the module sets.
  The master password is a `random_password` written to `/interview-manager-dev/OPENSEARCH_PASSWORD`; unlike
  the other three SSM parameters it does land in Terraform state, because `master_user_password` is a resource
  attribute and there is no placeholder-plus-`ignore_changes` trick for it. Switching to SigV4 would remove
  that, and needs a signing change in the search client.
- **Workers load the search credentials from SSM.** `WORKER_SECRETS` gained `OPENSEARCH_URL`, `_USERNAME` and
  `_PASSWORD`. `GetParameters` returns unknown names under `InvalidParameters` rather than failing, so the list
  is safe to ship while the domain does not exist — the worker simply finds no URL and uses Postgres.
