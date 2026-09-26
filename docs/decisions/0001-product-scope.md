# 0001. Product scope and feature set

- Status: Proposed
- Date: 2026-09-26

## Context
Job seekers keep one generic resume and hand-edit it for every application. That's slow, and the edits drift away from the truth. Interview Manager keeps one structured profile as the single source of truth. From it, agents build a master resume and then a tailored resume for each job. It also tracks each application through its interviews.

## Decision

### Core concepts
- **Profile**: structured facts about the user: contact, summary, experiences (with raw achievement notes), projects, skills, education, certifications, links. Every other artifact is derived from this.
- **Master resume**: an agent-generated, polished, complete resume built from the profile. Users can edit it, and it's versioned.
- **Job**: a target position: company, title, job description (JD), source URL, status.
- **Tailored resume**: a copy of the master resume adapted to one job. Carries a change rationale and a keyword coverage score.
- **Application**: a job plus its pipeline status, dates, contacts, notes and interview rounds.

### MVP features
1. Auth: email/password and one OAuth provider; works on web and mobile.
2. Profile builder: section-by-section forms, plus freeform paste ("dump my LinkedIn / old resume") that an agent turns into structured profile data.
3. Master resume generation (see ADR 0009) with streamed progress, inline editing and version history.
4. Job intake: paste a JD (a URL fetch is optional and best-effort).
5. Tailored resume per job (see ADR 0010), with a diff against the master and accept/reject per change.
6. PDF export of any resume version using one ATS-safe template.
7. Application tracker: statuses `saved → applied → screening → interviewing → offer | rejected | withdrawn`.

### Later
- Cover letter generation per job.
- Interview prep: likely questions from the JD and profile, STAR answer drafts, mock Q&A.
- Multiple resume templates and themes.
- Job import from boards and email.
- Reminders and follow-up nudges (push notifications on mobile).
- Analytics: response rate by resume version.

### Platform split
- **Web**: full experience, including heavy editing (profile, resume editor, diffs).
- **Mobile**: tracker-first. Quick job capture (share sheet → paste JD), trigger tailoring, review and approve changes, view/share the PDF, interview notes. Profile editing is light.

## Consequences
- The profile schema is the most important data model. Resume quality is capped by profile quality, so the profile builder has to make rich achievement notes easy to enter.
- The no-fabrication rule (ADR 0010) is a product promise, not just a prompt detail.

## Open questions
- Is URL-based JD fetching in the MVP, or paste-only?
- Monetization and usage limits: per-user caps on agent runs?
