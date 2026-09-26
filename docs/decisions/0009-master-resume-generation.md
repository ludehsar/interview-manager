# 0009. Master resume generation graph

- Status: Proposed
- Date: 2026-09-26

## Context
The master resume is the complete, polished, job-agnostic resume. It must contain only facts from the profile and read as strong, quantified and ATS-safe.

## Decision
Graph `master_resume`, input `{ userId }`:

1. **load_profile**: read the full profile; snapshot its hash on the run.
2. **normalize** (Haiku): clean raw achievement notes into atomic facts per experience/project. Dedupe skills, normalize dates and titles. Flag gaps (missing dates, no metrics).
3. **draft_sections** (Sonnet): produce a summary, experience bullets (action verb + what + measurable impact, only numbers present in facts), projects, skills grouped by category, education, certifications.
4. **critique** (Sonnet): score against a rubric: fact traceability, impact clarity, concision (1–2 lines per bullet), tense consistency, no first person, ATS-safe (no tables or graphics), length target (1 page under ~8 years' experience, 2 pages otherwise).
5. **revise**: if any rubric score is below threshold, loop back to `draft_sections` with the critique. Max 2 revisions.
6. **validate**: zod-validate the resume JSON. Every bullet carries `sourceFactIds` linking back to profile facts.
7. **persist**: create a new `ResumeVersion` (`source: agent`) on the user's master `Resume`.

Output: resume JSON plus a list of **profile gaps** (e.g. "No metrics for role X"). The UI shows these so the user can enrich the profile and regenerate.

Human edits: user edits create new `ResumeVersion` rows (`source: user`). A regeneration never overwrites user edits silently. It creates a new version, and the UI offers a diff.

## Consequences
- `sourceFactIds` makes fabrication detectable and powers "why is this here?" in the UI.
- Profile changes after generation mark the master resume as **stale**, by comparing the profile hash.

## Open questions
- Should users pick a tone or seniority preset before generation?
