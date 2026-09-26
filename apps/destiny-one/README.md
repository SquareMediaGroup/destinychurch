# Destiny One

The Destiny Church members' messaging app — communities with department sub-groups, built for
iOS and Android with Expo (SDK 57) and React Native. Liquid Glass on iOS 26+ via
`expo-glass-effect`.

**Status:** project skeleton wired to the complete backend. No screens yet.

## The rules (enforced by the server, not this app)

- No one-to-one chats. Groups have at least 3 people.
- Every group has at least 2 verified adults, or it freezes (read-only) and safeguarding is told.
- Only leaders create groups. Real names only. **No phone numbers anywhere.**
- Chats are not end-to-end encrypted and can be reviewed by the safeguarding team — the app must
  say so plainly, and must not show lock icons or "encrypted" badges.

The app should mirror these in the UI (use `canPost`, `canCreateGroup` etc. from
`@destiny/shared`), but never rely on itself to enforce them.

## Setup

```bash
cd apps/destiny-one
npm install
cp .env.example .env.local   # fill in the Supabase URL + publishable key
npx expo start
```

Native modules here (glass effect, secure store, notifications) need a **development build**
rather than Expo Go for full behaviour: `npx expo run:ios` / `run:android`, or
`npx eas-cli@latest build --profile development`.

## Layout

```
src/app/                 Expo Router routes (placeholder only)
src/components/          GlassSurface — Liquid Glass on iOS 26+, solid fallback elsewhere
src/lib/config.ts        EXPO_PUBLIC_* config
src/lib/secureStorage.ts Supabase session in Keychain/Keystore
src/lib/supabase.ts      Auth + Realtime only (never data)
src/lib/api.ts           Typed client for /api/app/v1/one (from @destiny/shared)
src/lib/auth.ts          Email one-time code; Sign in with ChurchSuite (PKCE)
src/lib/realtime.ts      Private d1-group:* / d1-member:* channels
src/lib/push.ts          Content-free push; ask in context, never on launch
```

`@destiny/shared` is linked from `../../packages/shared` (see `metro.config.js`). This app is not
a root npm workspace, on purpose: the website's build never installs React Native.

## Sign-in flow

1. Email: `requestEmailCode(email)` → `verifyEmailCode(email, code)`; or
   ChurchSuite (staff/leaders): `signInWithChurchSuite()`.
2. Both end in `api.link()`, returning `D1Me`. Anyone with an open invite for that email is let
   straight in. Otherwise route on `me.onboarding`:
   - `request_needed` → access request form → `api.requestAccess({ name, dateOfBirth?, note? })`
   - `request_submitted` → "waiting for approval" (show `me.onboardingMessage`)
   - `invite_only` / `suspended` → show `me.onboardingMessage`
   - `active` → continue
3. If `outstandingConsents` isn't empty, show the notices and call `api.acceptConsents(...)`.
4. Then `api.communities()`, `subscribeToMe(me.id, …)`, and per open group `subscribeToGroup(id, …)`.

People are verified by Destiny staff (invites and approvals in the website admin), not by
ChurchSuite. Sign in with ChurchSuite is an optional extra for staff.

The full list of screens and states to design is in `docs/destiny-one-ui-spec.md`.

## Checks

```bash
npm run typecheck
npx expo-doctor
npx expo export --platform ios --platform android
```

Backend docs: `REPOSITORY_DOCUMENTATION.md` (§29 and "Destiny One API"), GDPR notes:
`docs/destiny-one-gdpr.md`.
