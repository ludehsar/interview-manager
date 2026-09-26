# 0004. Bare React Native CLI mobile client

- Status: Proposed
- Date: 2026-09-26

## Context
Mobile focuses on application tracking, quick job capture from other apps, and reviewing tailored resumes on the go.

## Decision
- **Bare React Native (React Native CLI)**, not Expo. We keep full ownership of the native `ios/` and `android/` projects, which is useful for the share-sheet extension and native PDF viewing and sharing.
- Navigation: React Navigation.
- Server state: TanStack Query, with an API client typed from `packages/shared`.
- Auth: Better Auth client with bearer tokens stored in the Keychain/Keystore (see ADR 0007).
- Agent progress over SSE through a React Native–compatible EventSource. Fall back to polling the run status endpoint if needed.
- Monorepo: Metro `watchFolders` includes the repo root, and `nodeModulesPaths` resolves hoisted pnpm deps. Use `node-linker=hoisted` for the mobile app if symlink issues persist.

## Consequences
- We own native upgrades, signing and store builds ourselves. No EAS.
- CI needs macOS runners for iOS builds.
- The native share extension (iOS) and intent filter (Android) for job capture are custom native work.

## Open questions
- OTA updates: CodePush's successor or none?
- Minimum iOS/Android versions.
