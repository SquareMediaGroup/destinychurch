# Destiny One — GDPR & safeguarding data notes

**Status:** Draft, for the DPIA and the privacy-notice update. Not legal advice.
**Covers:** the Destiny One messaging backend (`/api/app/v1/one`, `supabase/migrations/20260926_01_destiny_one.sql`) and the Expo app (`apps/destiny-one`).

Destiny One is a members-only group messaging app used by adults **and children**, under a
safeguarding policy that forbids phone numbers and one-to-one messaging. Processing children's
data and reviewable private messages makes a **Data Protection Impact Assessment mandatory
before launch** (UK GDPR Art. 35; the ICO lists children's data and monitoring as high-risk).
This document is the technical input for it.

## 1. What we hold, and what we deliberately don't

| Data | Where | Why | Kept |
|---|---|---|---|
| Real name | `d1_members.display_name` (set by staff via invite/approval; from ChurchSuite only for ChurchSuite sign-ins) | Members must know who they're talking to; no pseudonyms in a safeguarding context | While the account exists; "Former member" after deletion |
| Date they turn 18 | `d1_members.adult_on` (staff decision) | The 2-adult rule. **Full date of birth is never stored** — only the date that matters | As above |
| Self-declared age | `d1_members.declared_adult_on` (from the access request; again only the 18th birthday) | Helps staff review a request. Never used by any rule | As above |
| Access request note | `d1_members.request_note` (≤500 chars) | Helps staff review a request | As above |
| Verification record | `verified_at`, `verified_by`, `verification_source` | Accountability: who let this person in, and how | As above |
| Invites | `d1_invites` (email, name, adult flag, roles, communities) | Pre-approving people | Until accepted/revoked; review and prune periodically |
| ChurchSuite ids (optional) | `d1_members.churchsuite_*_id` | Reference link only; ChurchSuite is not required | As above |
| Sign-in email | Supabase Auth (`auth.users`) only | Sign-in. Not copied into Destiny One tables, never shown to other members | Until account deletion |
| Messages, reactions, files | `d1_messages`, `d1_reactions`, `d1-chat-media` bucket | The service | Retention window (§4) |
| Group membership history | `d1_group_members` (incl. `left_at`) | Safeguarding: who was present when | Until the group is deleted |
| Consents | `d1_consents` | Evidence of what was accepted, when | While the account exists |
| Push token | `d1_push_tokens` | Notifications | Until sign-out, uninstall or deletion |
| Reports, safeguarding events | `d1_reports`, `d1_safeguarding_events` | Safeguarding | Retention window once closed |
| Transcript access log | `audit_log` (section `safeguarding`) | Accountability for reviews | Audit-log retention (`AUDIT_RETENTION_DAYS`, default 365) |

**Never collected:** phone numbers (no column exists; phone sign-in off; accounts with a phone
can't be activated; Android phone/SMS/contacts permissions blocked in `app.json`), home address,
full date of birth, location, contacts, medical or additional-needs information (dropped at the
ChurchSuite client by an allow-list — `lib/destinyOne/churchsuite.ts` `toPerson`, unit-tested).

## 2. Lawful bases (to confirm in the DPIA)

- **Running the messaging service** for members — legitimate interests (Art. 6(1)(f)); for a
  religious not-for-profit body's members, Art. 9(2)(d) where special-category data (religious
  belief is implied by membership) is involved.
- **Safeguarding review, retention of deleted messages, the 2-adult rule** — legitimate interests
  and the church's safeguarding obligations. This is why "delete" hides a message from members but
  keeps it until the retention purge, and why account deletion anonymises rather than erases
  messages inside the window. **Members must be told this plainly** — hence the mandatory
  `chat_review_notice` consent before chat unlocks.
- **Children:** the ICO Children's Code applies (the app is likely to be accessed by under-18s).
  Minors can only be added to groups by adult leaders, always with ≥2 verified adults present;
  there is no directory, profile or discovery surface for minors; notifications carry no content.

## 3. Processors and transfers

| Processor | Role | Data | Location |
|---|---|---|---|
| Supabase | Database, auth, storage, realtime | Everything in §1 | **Confirm the project region is EU/UK** before launch |
| Vercel | Runs the API | Transient (requests) | Confirm function region |
| ChurchSuite (optional) | Only if connected: staff sign-in and the approval lookup | Name, email, DOB (read-only by us; DOB reduced to the 18th birthday) | UK |
| Resend | Sends invite emails | Invitee's email and first name | Confirm region / DPA |
| Expo (push service) | Relays notifications | Push token + opaque group id — **no content, no names** | US |
| Apple APNs / Google FCM | Deliver notifications | As above | US |

Notifications are content-free by design (`lib/destinyOne/push.server.ts`) so no message text,
names, or information about a child passes through US processors. Document all of the above in the
privacy notice and hold DPAs with each.

## 4. Retention

- Messages, attachments, closed reports, resolved safeguarding events: **`D1_MESSAGE_RETENTION_DAYS`,
  currently a placeholder of 365 days**, enforced daily by `/api/cron/destiny-one-purge`
  (floor 30 days in SQL). ⚠️ **Must be set by the safeguarding policy (scoping doc D6)** before launch.
- Erased members' anonymised rows are removed once they own no remaining messages.

## 5. Data subject rights

| Right | How |
|---|---|
| Access (Art. 15) | `GET /api/app/v1/one/me/export` — JSON of profile, consents, memberships, own messages (incl. ones they deleted), own reports |
| Erasure (Art. 17) | `DELETE /api/app/v1/one/me` — leaves every group, removes tokens/consents/reactions, anonymises, deletes the sign-in. Messages remain under "Former member" until the retention purge (safeguarding exemption — state it in the notice) |
| Rectification (Art. 16) | Names and ages come from ChurchSuite; correct them there (synced nightly) |
| Object / restrict | Handled by the church office; a safeguarding admin can suspend an account |

## 6. Review access is itself controlled

Transcript access (`GET /api/admin/destiny-one/groups/[id]/transcript`) requires the
`safeguarding_admin` role, **a written reason**, and defaults to a 30-day window; every access is
recorded in the audit log with who, which group, which window and why. The safeguarding policy
should say who holds the role and how these logs are reviewed.

## 7. Before launch — checklist

- [ ] DPIA completed and signed off
- [ ] Supabase region confirmed EU/UK; DPAs in place (Supabase, Vercel, Expo, ChurchSuite)
- [ ] Supabase **phone auth provider disabled**
- [ ] Retention period agreed (D6) and `D1_MESSAGE_RETENTION_DAYS` set
- [ ] Privacy notice + terms + chat-review notice written; versions match `REQUIRED_CONSENTS` in `packages/shared/src/destinyOne/policy.ts`
- [ ] Safeguarding policy names who holds `safeguarding_admin` and how review logs are checked
- [ ] Decide invite-only vs open to requests (`/admin/destiny-one/settings`)
- [ ] Decide who holds Destiny One Admin (runs the app, no message access) and Safeguarding Admin (message review) — keep the latter to as few people as possible
- [ ] If ChurchSuite is connected at all: OAuth apps with the narrowest scopes (`addressbook.read children.read`; `user` for sign-in)
