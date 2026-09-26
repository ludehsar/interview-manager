# 0007. Better Auth hosted in NestJS

- Status: Proposed
- Date: 2026-09-26

## Context
Web (cookies) and bare React Native (no cookie jar by default) must authenticate against the same NestJS API. We want user data in our own Postgres with no per-user vendor fees.

## Decision
- **Better Auth** mounted in the NestJS `auth` module, using the Prisma adapter against the same database.
- Methods for MVP: email + password (with email verification) and Google OAuth.
- **Web**: HTTP-only secure session cookies. Web and API share a parent domain so cookies are first-party.
- **Mobile**: the Better Auth bearer plugin. The token is stored in the iOS Keychain / Android Keystore and sent as `Authorization: Bearer`. OAuth goes through the system browser with a deep-link callback.
- A global NestJS guard resolves the session into `request.user`. Routes are protected by default; public routes opt out.
- Rate limiting on auth endpoints.

## Consequences
- We own password reset emails, so an email provider is needed.
- Cookie domain strategy depends on where web is hosted (ADR 0003 open question).

## Open questions
- Email provider (Resend, Postmark, ...).
- Apple Sign In, which is required on iOS if other social logins are offered.
