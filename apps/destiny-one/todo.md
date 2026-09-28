# Destiny One — production checklist

**Target:** production by November 2026. **Audited:** 28 September 2026 (code, database rules, admin pages, nightly jobs, and a read-only look at the live Supabase project).

**Progress:** the items ticked below were done on 28 September 2026 (migration `supabase/migrations/20260928_01_destiny_one_safeguarding.sql`, applied to the live Supabase project on 28 September 2026; the website code that uses it is in PR #38). Report alert emails go to everyone with the Safeguarding Admin role, and there are none yet, so add at least one. React Compiler lint rules are warnings for now (see `apps/destiny-one/eslint.config.js`).

**Already in good shape:** the safeguarding rules (no one-to-one chats, at least 2 adults per group, leaders-only group creation, deleted messages kept for review) are enforced in the database itself. App and website typecheck, the 69 Destiny One unit tests, the SQL rule tests and `expo-doctor` all pass. Data is stored in the EU (Ireland).

**Timing:** the slow parts are not code: store accounts, a first run on real phones, beta review, and the legal and safeguarding paperwork. Suggested order: sections 1 and 3 plus a first device build in the next two weeks; section 2 fixes by about week 5; weeks 6–8 for beta and store review.

---

## 1. Decisions only Destiny can make (leadership and safeguarding lead)

- [ ] **Minimum age and parental consent.** There is no minimum age and no parent step. The website's safeguarding policy promises parental consent before children are photographed, yet children can send photos and set a profile picture.
- [ ] **How long messages are kept.** 365 days is a placeholder (`D1_MESSAGE_RETENTION_DAYS`).
- [ ] **Should adults count toward the 2-adult rule before they've signed in?** Staff-invited adults count as soon as the invite is sent, so a group can meet the rule on paper with only one real adult actually present.
- [ ] **Who reads chats.** The live database has 0 safeguarding admins and 4 super admins, and super admins can open chat transcripts. Name the safeguarding admins and decide whether super admins should keep that access.
- [ ] **Should children's notifications show a message preview?** The UK children's privacy code (ICO Children's Code) expects the most private setting by default.
- [ ] **Invite-only, or open to access requests?** (`/admin/destiny-one/settings`)
- [ ] **Keep profile pictures in Destiny One?** If yes, they must be private (see section 2).
- [ ] **Remove "Sign in with ChurchSuite — Coming soon"** from the store build (`src/app/welcome.tsx`). Apple tends to reject placeholder features.
- [ ] **Data protection impact assessment (DPIA)** completed and signed off. Legally required before launch (`docs/destiny-one-gdpr.md`).

## 2. Safeguarding and privacy fixes (blockers)

- [x] **Blocking abusive users.** Apple requires this for apps where people post content (guideline 1.2). Not built.
- [ ] **Rewrite the privacy notice and terms to cover Destiny One.** `/privacy` and `/terms` don't mention the app, messaging, notification previews or US processors, so people are currently agreeing to notices that don't describe it. Bump the versions in `REQUIRED_CONSENTS` (`packages/shared/src/destinyOne/policy.ts`) when they change.
- [ ] **Update the public safeguarding policy** (`app/safeguarding/page.tsx`) to cover online messaging.
- [x] **Profile photos are publicly viewable.** The `d1-avatars` bucket is public; deleting an account doesn't remove the photo; suspended or unapproved accounts can still upload (`app/api/app/v1/one/me/avatar/route.ts` uses `authenticate`, not `requireMember`).
- [x] **Remove photo location data before upload.** Nothing strips GPS/EXIF details, and the file-picker path sends the original file untouched (`src/components/Composer.tsx`, `src/lib/upload.ts`).
- [x] **The nightly purge deletes messages linked to open reports**, so evidence can disappear mid-investigation (`d1_purge_expired` in `supabase/migrations/20260926_01_destiny_one.sql`).
- [x] **Email the Safeguarding Lead when a report comes in.** Today a report only shows in the website admin bell.
- [x] **Give safeguarding admins tools to act.** They can pause a group but can't take down a message or suspend the sender (suspending is only in the Destiny One Admin area).
- [ ] **Stop the email check revealing who's a member.** `POST /api/app/v1/one/auth/check` tells anyone whether an email belongs to a member, including children.
- [x] **Move people off the chats if they're suspended mid-session**, or when new notices need accepting. The app only re-routes at launch, and cached chats stay readable (`src/state/session.tsx`).
- [ ] **Check on a phone** that someone removed from a group, or suspended, stops receiving live messages straight away (Realtime checks membership when a channel joins).
- [x] **Make account deletion match what's promised.** Erasure now deletes consent records, blocks and the profile picture (row and file).
- [ ] **Complete the data export.** `me/export` still leaves out the access-request note, declared age and files sent.

## 3. App Store and Google Play

- [ ] Apple Developer and Google Play accounts **as an organisation** (needs a D-U-N-S number, which can take a couple of weeks). A personal Play account has to run a 14-day closed test with 12 testers first.
- [ ] **A way for App Review to sign in.** Sign-in is email-code only, so reviewers need a demo account.
- [ ] **Android push setup:** add the Firebase config file to `app.json` and give EAS the Firebase key. Neither exists, so Android notifications won't work.
- [ ] Store listings, screenshots, Apple privacy labels, Play data safety form, age ratings, and Google Play's policy for apps used by children.
- [ ] Set `D1_IOS_STORE_URL` / `D1_ANDROID_STORE_URL` on Vercel once the listings are live. Change the version in `app.json` from 0.1.0 to 1.0.0.
- [ ] Update the "no Destiny app" answer at `app/help/page.tsx:150`.

## 4. Setup and infrastructure

- [ ] **Confirm Supabase sends sign-in emails through your own provider** (for example Resend). Supabase's built-in sender is heavily restricted, and the code is the only way to sign in. Not checked (not visible from here).
- [ ] Confirm the phone sign-in provider is switched off in Supabase Auth.
- [ ] **Put the API on a custom domain before the first store build.** The address is baked into every build (`destinychurch.vercel.app`, `app.json` `extra.apiBaseUrl`) and can't be changed in copies people already have.
- [ ] **A staging environment.** Every EAS build profile points at the live database. The unused, paused "DestinyOne" Supabase project could be the staging copy.
- [x] Record `20260926_01_destiny_one` and `20260927_01_destiny_one_admin` in the live migration history. They were run outside it, so a fresh database can't be rebuilt reliably.
- [ ] Clear the test data from the live database (3 members, 7 messages at the time of the audit).
- [ ] Data processing agreements with Supabase, Vercel, Expo, Resend, Apple and Google.
- [ ] Set `EXPO_ACCESS_TOKEN` and switch on push security in Expo.

## 5. Test on real phones (it has never run on one)

- [ ] An iPhone and an Android build, going through every screen.
- [ ] **Photos in older chats.** Image links expire after an hour (`SIGNED_URL_TTL` in `lib/destinyOne/chat.server.ts`) but the app keeps messages cached for up to 30 days, so older photos are likely to break.
- [ ] **Android keyboard covering the message box.** The chat screen only handles the keyboard on iOS (`src/app/group/[id]/index.tsx`).
- [ ] Opening the app from a notification when it was fully closed.
- [ ] VoiceOver/TalkBack labels, large text sizes and dark mode.

## 6. Reliability and housekeeping

- [ ] Crash and error reporting in the app (none today).
- [ ] Alerts when the nightly purge or rule-check jobs fail (`app/api/cron/destiny-one-*`).
- [ ] Rate limits that actually hold on Vercel. They're per server instance today (`lib/rateLimit.ts`).
- [x] Add the app typecheck and the SQL rule tests to CI (`.github/workflows/ci.yml`), and include migrations 05 and 06 in `scripts/test-sql.sh`.
- [x] A lint setup for the app. `expo lint` has no config and doesn't run.
- [ ] Clear the 31 React Compiler lint warnings (refs and effects in the tab bar, `ui.tsx`, `useConversation.ts`), re-testing on a device, then turn those rules back into errors.
- [x] Add the `.env.example` the README refers to.
- [ ] Decide whether to encrypt the message cache stored on the phone (plain AsyncStorage today; the sign-in session is already in the secure store).
- [ ] Bring the docs up to date: the GDPR doc still says names are corrected in ChurchSuite, and the screen spec (A10) still says notifications never show the message.

## 7. Launch

- [ ] Internal TestFlight, then external TestFlight and a Play closed test with a real group of adults and young people.
- [ ] A short guide for staff: approvals, reports, pausing a group, and what to do out of hours.
- [ ] A phased release, using the forced-update switch in `/admin/destiny-one/settings` as a safety net.
