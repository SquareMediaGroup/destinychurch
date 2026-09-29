# Destiny One — production checklist

**Target:** production by November 2026. **Audited:** 28 September 2026 (code, database rules, admin pages, nightly jobs, and a read-only look at the live Supabase project).

**Progress:** the items ticked below were done on 28 September 2026 (migration `supabase/migrations/20260928_01_destiny_one_safeguarding.sql`, applied to the live Supabase project on 28 September 2026; the website code that uses it is in PR #38). Report alert emails go to everyone with the Safeguarding Admin role, and there are none yet, so add at least one.

**Already in good shape:** the safeguarding rules (no one-to-one chats, at least 2 adults per group, leaders-only group creation, deleted messages kept for review) are enforced in the database itself. App and website typecheck, the 69 Destiny One unit tests, the SQL rule tests and `expo-doctor` all pass. Data is stored in the EU (Ireland).

**Timing:** the slow parts are not code: store accounts, a first run on real phones, beta review, and the legal and safeguarding paperwork. Suggested order: sections 1 and 3 plus a first device build in the next two weeks; section 2 fixes by about week 5; weeks 6–8 for beta and store review.

---

## 1. Decisions only Destiny can make (leadership and safeguarding lead)

Decided with the product owner on 28 September 2026:

- [x] **Minimum age:** 13 and over, no parent or carer step. The app and server refuse anyone under 13.
- [x] **How long messages are kept:** 1 year (`D1_MESSAGE_RETENTION_DAYS=365`, the default). A message under an open report is kept until the report is closed.
- [x] **Adults count toward the 2-adult rule from the invite** (as now), so staff can set groups up before people sign in.
- [x] **Who reads chats:** Safeguarding Admins only. Super admins can no longer open transcripts without the role.
- [ ] **Give the Safeguarding Admin role to the right people** at `/admin/users` (there are none yet, so report emails go to nobody). The product owner is arranging this.
- [x] **Children's notifications keep the message preview**, like adults'. Revisit if the safeguarding lead or the DPIA says otherwise.
- [x] **Invite-only:** access requests are switched off.
- [x] **Profile pictures stay**, stored privately.
- [x] **"Sign in with ChurchSuite" is hidden** for the store build (the code stays, to switch on later).
- [x] **Email check fixed:** the app no longer reveals whether an email belongs to a member.
- [x] **API address stays `destinychurch.vercel.app`** in store builds.
- [x] **No separate staging database:** test builds use the live one, so clear test data before launch.
- [x] **Saved messages on the phone stay protected by the phone's own encryption** (as most chat apps do), and are wiped on sign-out.
- [ ] **Data protection impact assessment (DPIA):** draft written (`docs/destiny-one-dpia-draft.md`); needs review and sign-off by the church's data protection lead.

## 2. Safeguarding and privacy fixes (blockers)

- [x] **Blocking abusive users.** Apple requires this for apps where people post content (guideline 1.2). Not built.
- [ ] **Rewrite the privacy notice and terms to cover Destiny One.** `/privacy` and `/terms` don't mention the app, messaging, notification previews or US processors, so people are currently agreeing to notices that don't describe it. Bump the versions in `REQUIRED_CONSENTS` (`packages/shared/src/destinyOne/policy.ts`) when they change. Draft wording ready for sign-off: `docs/content/destiny-one-notices-draft.md`.
- [ ] **Update the public safeguarding policy** (`app/safeguarding/page.tsx`) to cover online messaging. Draft section in the same file.
- [x] **Profile photos are publicly viewable.** The `d1-avatars` bucket is public; deleting an account doesn't remove the photo; suspended or unapproved accounts can still upload (`app/api/app/v1/one/me/avatar/route.ts` uses `authenticate`, not `requireMember`).
- [x] **Remove photo location data before upload.** Nothing strips GPS/EXIF details, and the file-picker path sends the original file untouched (`src/components/Composer.tsx`, `src/lib/upload.ts`).
- [x] **The nightly purge deletes messages linked to open reports**, so evidence can disappear mid-investigation (`d1_purge_expired` in `supabase/migrations/20260926_01_destiny_one.sql`).
- [x] **Email the Safeguarding Lead when a report comes in.** Today a report only shows in the website admin bell.
- [x] **Give safeguarding admins tools to act.** They can pause a group but can't take down a message or suspend the sender (suspending is only in the Destiny One Admin area).
- [x] **Stop the email check revealing who's a member.** `POST /api/app/v1/one/auth/check` tells anyone whether an email belongs to a member, including children. Done: the server sends the code and always gives the same answer.
- [x] **Move people off the chats if they're suspended mid-session**, or when new notices need accepting. The app only re-routes at launch, and cached chats stay readable (`src/state/session.tsx`).
- [ ] **Check on a phone** that someone removed from a group, or suspended, stops receiving live messages straight away (Realtime checks membership when a channel joins).
- [x] **Make account deletion match what's promised.** Erasure now deletes consent records, blocks and the profile picture (row and file).
- [x] **Complete the data export.** `me/export` still leaves out the access-request note, declared age and files sent. Done: the export now includes all of these, plus reactions, blocks and the profile picture.

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
- [x] **Put the API on a custom domain before the first store build.** The address is baked into every build (`destinychurch.vercel.app`, `app.json` `extra.apiBaseUrl`) and can't be changed in copies people already have. Decided: keep `destinychurch.vercel.app`.
- [x] **A staging environment.** Every EAS build profile points at the live database. The unused, paused "DestinyOne" Supabase project could be the staging copy. Decided: no staging copy; clear test data before launch.
- [x] Record `20260926_01_destiny_one` and `20260927_01_destiny_one_admin` in the live migration history. They were run outside it, so a fresh database can't be rebuilt reliably.
- [x] **Merge the polls work so the repo matches the live database.** `20260928_02_destiny_one_content` (poll votes, a `content` column, and a new `d1_post_message` with an extra optional argument) was applied to the live project on 28 September from `feature/destiny-one-restore-polls`, before being merged. Done: merged in #39 and covered by `scripts/test-sql.sh`.
- [x] **The admin notifications tables were missing from the live database** (`20260922_02_notifications` was never applied), so reporting a message or a group being paused would have failed. Applied on 29 September 2026, with the emit and purge functions limited to the server.
- [x] Other repo migrations not yet on the live database. Applied on 29 September 2026: `20260902_remove_media_boards`, `20260922_hr_review_reviewer_scoping`, `20260927_04_posts_page_settings` (already there, now recorded) and `20260927_04_remove_live_chat`. `20260514_studio_v2_schema` is obsolete (the page builder it changes was removed) and was skipped.
- [ ] Empty and delete the `media-photos` storage bucket in the Supabase dashboard (22 files; it's public, so they can still be opened by link). SQL can't remove a bucket with files in it.
- [ ] **Leaked password protection** (Supabase → Authentication → Providers → Email → "Prevent use of leaked passwords"). Needs the Pro plan; the organisation is on Free. The app and the website admin reset already explain a refused password.
- [ ] Clear the test data from the live database (3 members, 7 messages at the time of the audit).
- [ ] Data processing agreements with Supabase, Vercel, Expo, Resend, Sentry, Apple and Google.
- [ ] Set `EXPO_ACCESS_TOKEN` and switch on push security in Expo.

## 5. Test on real phones (it has never run on one)

- [ ] An iPhone and an Android build, going through every screen.
- [x] **Photos in older chats.** Image links expire after an hour (`SIGNED_URL_TTL` in `lib/destinyOne/chat.server.ts`) but the app keeps messages cached for up to 30 days, so older photos are likely to break. Fixed in code: the app now swaps in fresh links when they expire (still worth checking on a phone).
- [x] **Android keyboard covering the message box.** The chat screen only handles the keyboard on iOS (`src/app/group/[id]/index.tsx`). Fixed in code: it pads for the keyboard on Android too (still check on an Android phone).
- [ ] Opening the app from a notification when it was fully closed.
- [ ] VoiceOver/TalkBack labels, large text sizes and dark mode.

## 6. Reliability and housekeeping

- [ ] Crash and error reporting in the app (none today). Done in code: Sentry, off until `EXPO_PUBLIC_SENTRY_DSN` is set (setup steps in `apps/destiny-one/README.md`). Still to do: create the Sentry account (EU region) and add the EAS variables.
- [x] A way for people to report problems and send feedback from the app. Done: Profile → Report a problem / Send feedback, read by Destiny One Admins at `/admin/destiny-one/feedback` (bell notification). Kept in the database, not GitHub (the repo is public), and included in data export and account deletion. Migration applied to the live project on 29 September 2026. Shaking the phone offers it too (asks first; can be switched off on the same screen). Still to check on a device: how firm a shake it needs.
- [x] Alerts when the nightly purge or rule-check jobs fail (`app/api/cron/destiny-one-*`). Done: failures email `D1_OPS_ALERT_RECIPIENT`.
- [x] Rate limits that actually hold on Vercel. They're per server instance today (`lib/rateLimit.ts`). Done: counted in the database as well (`20260928_03_destiny_one_rate_limits.sql`).
- [x] Add the app typecheck and the SQL rule tests to CI (`.github/workflows/ci.yml`), and include migrations 05 and 06 in `scripts/test-sql.sh`.
- [x] A lint setup for the app. `expo lint` has no config and doesn't run.
- [x] Clear the 31 React Compiler lint warnings (refs and effects in the tab bar, `ui.tsx`, `useConversation.ts`), re-testing on a device, then turn those rules back into errors. Done in code: the rules are errors again. Also fixed the account-switch banner staying on screen for good if tapped. Still to check on a device: search results, the account-switch banner, the "New messages" divider, notification mute choices and the edit-group screen.
- [x] Add the `.env.example` the README refers to.
- [x] Decide whether to encrypt the message cache stored on the phone (plain AsyncStorage today; the sign-in session is already in the secure store). Decided: leave it to the phone's own encryption.
- [x] Bring the docs up to date: the GDPR doc still says names are corrected in ChurchSuite, and the screen spec (A10) still says notifications never show the message.

## 7. Launch

- [ ] Internal TestFlight, then external TestFlight and a Play closed test with a real group of adults and young people.
- [x] A short guide for staff: approvals, reports, pausing a group, and what to do out of hours. Draft: `docs/destiny-one-staff-guide.md`, to check against the signed-off safeguarding policy.
- [ ] A phased release, using the forced-update switch in `/admin/destiny-one/settings` as a safety net.
