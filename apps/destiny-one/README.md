# Destiny One

The Destiny Church members' messaging app — communities with department sub-groups, built for
iOS and Android with Expo (SDK 57) and React Native. Liquid Glass on iOS 26+ via
`expo-glass-effect`.

**Status:** every screen built (design variants 1B chat list + 1F conversation), wired to the complete backend. Not yet run on a device.

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
src/app/                 Expo Router routes — one per screen in docs/destiny-one-ui-spec.md
src/components/          UI kit (ui.tsx: beam, buttons, fields, cards, dialogs), Icon, GlassSurface,
                         MessageBubble (1F), MessageActions, Composer, GroupRows (1B)
src/theme/tokens.ts      Light/dark colour tokens from the Claude Design prototype
src/state/               session (me, routing, shared chat list), picker (Add people selection)
src/lib/useConversation  One chat: paging, realtime, optimistic send/retry, uploads, reactions
src/lib/config.ts        EXPO_PUBLIC_* config
src/lib/secureStorage.ts Supabase session in Keychain/Keystore
src/lib/supabase.ts      Auth + Realtime only (never data); one client per account
src/lib/accounts.ts      Accounts signed in on this phone; quick switching
src/lib/api.ts           Typed client for /api/app/v1/one (from @destiny/shared)
src/lib/auth.ts          Email one-time code; Sign in with ChurchSuite (PKCE)
src/lib/realtime.ts      Private d1-group:* / d1-member:* channels
src/lib/push.ts          Push (group name + "Sender: first line"); ask in context, never on launch
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

## Several accounts

More than one account can be signed in at once. Double-press the Profile tab to switch to the
last account you used (a banner says who), or hold it (or Profile → Switch account) for the full
list; it asks for Face ID or the passcode unless you used that account in the last minute. Add an
account from Profile → Add account (child or admin account). Hold Send in a chat to send as another
of your accounts (never a child account). Sign in with a password or an emailed code. Each account has its own Supabase
client, session and saved cache, so switching back is instant. See `src/lib/accounts.ts` and
"Accounts" under Destiny One in `REPOSITORY_DOCUMENTATION.md`. Adding `expo-local-authentication`
means a new development build is needed.

The full list of screens and states to design is in `docs/destiny-one-ui-spec.md`.

## Forced update and maintenance

On launch and on every return to the foreground the app reads `GET /api/app/v1/one/config`
(no token). If its native build number is below the minimum for its platform it shows the update
screen over everything; if a maintenance message is set, everyone sees that instead. Both are set
at `/admin/destiny-one/settings` ("App versions" and "Maintenance"), so a bad build can be retired
without a release. The last answer is cached, so an offline launch is never blocked. Expo Go and
web have no build number and are always let in.

## Icons and splash

Generated from `public/img/brand/destiny-icon.svg` by `node scripts/make-icons.mjs` (uses `sharp`
from the repo root's `node_modules`). Re-run it when the mark changes, or replace
`assets/icon.png` by hand with a designed 1024px icon (no transparency).

## Releasing (iOS, TestFlight)

Builds run on EAS in the cloud, so no local Xcode is needed.

1. Create the app in App Store Connect with bundle ID `uk.destinytees.one` (needs the Apple
   Developer account).
2. Set the build-time variables on EAS for the `preview` and `production` environments:
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and optionally
   `EXPO_PUBLIC_API_BASE_URL`), in the Expo dashboard or with `npx eas-cli@latest env:create`.
3. `npx eas-cli@latest build --platform ios --profile production`. EAS offers to create the
   distribution certificate, provisioning profile and push (APNs) key; say yes.
4. `npx eas-cli@latest submit --platform ios --latest`.
5. In App Store Connect → TestFlight, add testers by email. Internal testers (people on the App
   Store Connect team) get it straight away; external testers need Beta App Review, usually a day.

Build numbers auto-increment on EAS (`appVersionSource: remote`). To retire a build, raise
"Lowest iOS build allowed" in the admin above it.

Before external TestFlight or the App Store:
- Apple guideline 1.2 (user-generated content) requires reporting and blocking abusive users
  (both built: long-press a message → Report / Block; Settings → Blocked people).
- The privacy policy must say push notifications show a message preview.
- Once the app is live, set `D1_IOS_STORE_URL` on Vercel to its App Store link so the Update
  button stops pointing at TestFlight.

## Crash reporting (Sentry)

Off until it's configured, so nothing is reported from local or test builds by default. To switch it
on:

1. Create a Sentry account in the **EU** region (the region can't be changed later) and a React
   Native project.
2. On EAS, for each environment that should report (`npx eas-cli@latest env:create`):
   - `EXPO_PUBLIC_SENTRY_DSN`: the project's DSN (plain text is fine; it only lets the app send
     reports).
   - `SENTRY_AUTH_TOKEN` (secret), `SENTRY_ORG` and `SENTRY_PROJECT`: let builds upload source maps
     so crashes show the real file and line.
3. Once uploads work, consider removing `SENTRY_ALLOW_FAILURE` from `eas.json`, so a failed upload
   fails the build instead of passing silently.
4. After `eas update`, upload that update's source maps too:
   `npx eas-cli@latest update --branch <branch> && npx sentry-expo-upload-sourcemaps dist`.

What it sends, and what it deliberately doesn't, is described in `src/lib/sentry.ts`. Sentry is a
data processor: it needs a data processing agreement and a line in the privacy notice.

## Checks

```bash
npm run typecheck
npx expo lint
npx expo-doctor
npx expo export --platform ios --platform android
```

Backend docs: `REPOSITORY_DOCUMENTATION.md` (§29 and "Destiny One API"), GDPR notes:
`docs/destiny-one-gdpr.md`.
