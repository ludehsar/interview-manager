# 0010. Per-job resume tailoring graph

- Status: Proposed
- Date: 2026-09-26

## Context
Each job needs a resume that foregrounds the most relevant experience and mirrors the JD's language. It must never claim skills or results the user doesn't have.

## Decision
Graph `tailor_resume`, input `{ userId, jobId, masterVersionId }`:

1. **parse_jd** (Haiku): extract role title, seniority, must-have skills, nice-to-have skills, key responsibilities, domain keywords. Cached on `Job.parsedRequirements`.
2. **match** (Sonnet): map each requirement to supporting profile facts (via the master resume's `sourceFactIds` plus the full profile). Label each one `strong | partial | missing`.
3. **plan_changes** (Sonnet): decide per section:
   - summary rewrite toward the role;
   - reorder experiences and bullets by relevance;
   - rephrase bullets to use the JD's terminology **only where the fact supports it**;
   - pull in relevant profile facts that weren't in the master;
   - drop or shorten low-relevance items to hold the length target;
   - reorder skills with matched skills first.
4. **apply_changes**: produce the tailored resume JSON. Each change records `{ path, before, after, reason, sourceFactIds }`.
5. **fact_check** (Sonnet, separate prompt): verify every changed bullet against its source facts. Unsupported claims are reverted and logged.
6. **score**: keyword coverage (must-haves hit / total) before vs after, plus the list of `missing` requirements.
7. **human_review** (`interrupt()`): the user accepts or rejects changes individually or all at once. The run resumes with their decisions.
8. **persist**: a `ResumeVersion` on the job's tailored `Resume` (`source: agent`).

**No-fabrication rule**: a skill, tool, metric or responsibility can appear only if it traces to a profile fact. Missing requirements are surfaced to the user as gaps ("Add Kubernetes experience to your profile if you have it"), never invented.

## Consequences
- The change list with reasons doubles as the diff UI and as an explanation for the user.
- Requirements the user can't truthfully cover are shown honestly. Coverage scores may stay below 100%.

## Open questions
- Should tailoring start from the latest master or allow any master version? The default is latest.
- Is the human review step skippable ("auto-accept") for power users?
