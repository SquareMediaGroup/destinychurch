# Destiny One — Data Protection Impact Assessment (DRAFT)

**Status: DRAFT for review and sign-off. Not legal advice.** Prepared from how the app actually works (the code, the database rules and `docs/destiny-one-gdpr.md`) and the product decisions of 28 September 2026. It follows the structure of the ICO's sample DPIA template. The church's data protection lead should check every section, fill in the `[bracketed]` items, consult the people named in step 4, and sign step 7.

| | |
|---|---|
| Controller | Destiny Church Tees Valley |
| Processing | Destiny One, a members-only group messaging app (iOS and Android), with its admin area on the church website |
| Prepared by | Square Media Group (draft), 28 September 2026 |
| Data protection lead | `[name]` |
| Safeguarding lead (DSL) | `[name]` |
| Planned launch | November 2026 |

---

## Step 1: Why a DPIA is needed

Destiny One processes **children's personal data** (members aged 13 to 17), **private messages that trained staff can review**, and data that reveals **religious belief** (membership of the church). The ICO lists processing children's data for online services, and monitoring, as likely to be high risk, and the UK GDPR (Article 35) requires a DPIA before this kind of processing starts. The ICO Age Appropriate Design Code (Children's Code) also applies, since under-18s will use the app.

## Step 2: The processing

**What the app does.** Members chat in groups inside "communities" (for example a church team). Each community has an Announcements group. There are no one-to-one chats. Members can send text, photos and PDFs, react, reply, report messages and block people. Staff approve every member and set their age. A small safeguarding team can review a group's messages when a concern is raised.

**How data is collected.** From members themselves (sign-in email, messages, files, an optional access-request note and date of birth, an optional profile picture), and from staff (real name, whether someone is an adult, their 18th birthday if under 18, leader roles, group membership).

**Data held** (full table: `docs/destiny-one-gdpr.md` §1):
- Identity: real name; email (sign-in only, never shown to other members); the date someone turns 18 (never the full date of birth); verification record (who approved them and when).
- Membership: communities and groups, including join and leave times (kept so a review can see who was present).
- Content: messages, reactions, photos and PDFs. Deleted messages are hidden from members but kept for the retention period.
- Safety: reports, blocks, safeguarding events (pauses, reports), the audit log of every review.
- Technical: push notification tokens, consents accepted.
- Optional: a profile picture (private storage).

**Not collected:** phone numbers (no field exists; accounts with one can't be activated), address, location (removed from photos on the phone before upload), contacts, full date of birth, medical information.

**Who can see what.**
- Members see only the groups they're in, and only messages sent since they joined.
- Leaders see whether members of groups they manage are adults (needed for the 2-adult rule). They never see contact details.
- Destiny One Admins run the app (approvals, groups, settings) and **cannot read messages**.
- **Safeguarding Admins only** can read a group's messages (decided 28 September 2026: super admins can't, unless given the role). Each review needs a written reason and is recorded.

**Processors:** Supabase (database, sign-in, files; EU, Ireland), Vercel (runs the API; `[region]`), Resend (sign-in and invite emails; `[region]`), Sentry (crash reports, no names, emails or message text; EU, Germany), Expo, Apple and Google (deliver notifications; USA). ChurchSuite only if staff sign-in is switched on later (UK).

**Retention.** Messages and files: **1 year** (decided 28 September 2026), deleted automatically each night; a message under an open report is kept until the report is closed. Closed reports and resolved safeguarding records: 1 year. Review audit log: `[365 days]`. Deleted accounts: anonymised to "Former member" at once; their messages follow the 1-year rule.

**Scale.** `[Expected number of members, and roughly how many under 18]`, in `[number]` communities.

## Step 3: Context

- **Relationship:** members are part of the church community. Under-18s are in the church's youth and children's work. They'd reasonably expect the church to keep them safe, and many would expect some adult oversight of youth group chats.
- **Children:** the minimum age is **13** (decided 28 September 2026). There is no parent or carer consent step, because UK data law treats 13 as the age a child can agree to an online service themselves and the lawful basis isn't consent. `[Consider whether parents should still be told their child has joined, as good practice.]`
- **Control:** members can leave groups, mute them, block people, report messages, download their data and delete their account. They can't change their real name (it's set by staff) because pseudonyms undermine safeguarding.
- **Concerns in this area:** grooming and private contact between adults and children; bullying; sharing images of children; over-reaching monitoring of private conversations.
- **Current approach elsewhere:** WhatsApp groups are common in churches but offer no oversight, allow one-to-one messaging, and expose phone numbers. Destiny One is designed to replace that.
- **Invite-only:** only people staff invite can join (decided 28 September 2026).

## Step 4: Consultation

`[To do before sign-off:]`
- The Designated Safeguarding Lead and trustees (safeguarding policy, who holds the Safeguarding Admin role, how review logs are checked).
- A sample of parents and young people (the notices, especially "How your chats are kept safe").
- Group leaders who will run groups.
- Processors' data processing agreements (Supabase, Vercel, Resend, Sentry, Expo).

## Step 5: Necessity and proportionality

**Lawful basis** `[confirm]`:
- Running the service for members: legitimate interests (Article 6(1)(f)). Special category (religious belief): Article 9(2)(d), processing by a not-for-profit religious body about its members.
- Safeguarding (the 2-adult rule, reviews, keeping deleted messages for a year): legitimate interests, and the church's safeguarding duties. A legitimate interests assessment should be attached.

**Is it necessary, and is there a less intrusive way?**
- Group messaging for church teams is the purpose; the app collects only what that needs (no phone, address or location; only the 18th birthday, not the full date of birth).
- Review access is the least intrusive way to make children's group chats safe: it happens only when a concern is raised, only by named people, with a reason, and every look is recorded. End-to-end encryption was considered and rejected, because it would make investigating a concern impossible. Members are told this plainly before they can chat.
- A 1-year retention balances late disclosures (which are common) against holding children's messages longer than needed.

**Transparency:** members must accept the privacy notice, terms and "How your chats are kept safe" notice before chatting, and are asked again when they change. Draft wording: `docs/content/destiny-one-notices-draft.md`.

**Rights:** access (in-app download of everything held), rectification (via the church office), erasure (in-app account deletion; messages kept for the retention period under the safeguarding exemption, and members are told this), objection and restriction (via the church office; an account can be suspended).

**International transfers:** notification previews (group name, sender's name, first line of the message) pass through Expo, Apple and Google in the USA. Children's notifications keep the preview (decided 28 September 2026). `[Confirm the transfer mechanism for each: UK IDTA / Addendum, or the UK Extension to the EU–US Data Privacy Framework.]`

## Step 6: Risks

Likelihood: remote / possible / probable. Severity: minimal / significant / severe.

| # | Risk | Likelihood | Severity | Overall |
|---|---|---|---|---|
| R1 | An adult uses the app to groom or contact a child privately | Possible | Severe | High |
| R2 | Bullying or harmful content between members, including children | Probable | Significant | High |
| R3 | Safeguarding reviewers read more than they need to (over-monitoring) | Possible | Significant | Medium |
| R4 | Someone who isn't a member, or an under-13, gets in | Possible | Significant | Medium |
| R5 | Children's message content is shown on lock screens or passes through US processors in notifications | Probable | Significant | Medium |
| R6 | A data breach exposes messages or children's data | Remote | Severe | Medium |
| R7 | Evidence of harm is deleted before it's investigated | Possible | Severe | Medium |
| R8 | Photos reveal a child's location or identity to others | Possible | Significant | Medium |
| R9 | A group keeps running without two adults actually present | Possible | Significant | Medium |
| R10 | A report sits unseen (no one monitoring, out of hours) | Possible | Severe | High |

## Step 7: Measures to reduce the risks

| Risk | Measures (built unless marked) | Effect | Residual |
|---|---|---|---|
| R1 | No one-to-one chats for anyone; every group needs 3+ people incl. 2+ adults, enforced in the database and re-checked nightly; a group that drops below pauses and alerts staff; only adult leaders create groups or add people; no phone numbers or contact details anywhere; real names only; reviewable messages | Reduced | Medium |
| R2 | Report on any message (goes to Safeguarding Admins by email and admin bell); block; safeguarding can remove messages, suspend senders and pause groups; terms of use set expectations | Reduced | Medium |
| R3 | Review needs the Safeguarding Admin role itself, a written reason, a date window (default 30 days); every review is audit-logged; Destiny One Admins can't read messages. `[Policy: name the role holders, and who checks the review log and how often]` | Reduced | Low |
| R4 | Invite-only; every member approved by staff, who set their age; minimum age 13 refused by the app and server; sign-in by email code, and the sign-in screen doesn't reveal who is a member | Reduced | Low |
| R5 | Members told plainly; mute any group; notification body limited to 100 characters. `[Option: turn previews off for under-18s if the DSL prefers]` | Accepted | Medium |
| R6 | EU hosting; all tables deny-all (the app never reads the database directly); the API applies every rule; files in private storage behind short-lived links; sign-in tokens in the phone's secure storage; rate limits shared across servers; audited admin access | Reduced | Low |
| R7 | Deleted messages kept for 1 year; a reported message kept until its report is closed; review includes deleted messages and full membership history | Eliminated for reported content | Low |
| R8 | Photos re-encoded on the phone (location and hidden details removed); profile pictures private. `[Policy: ask members not to share photos of children without a parent's permission]` | Reduced | Low |
| R9 | Rule enforced continuously. **Accepted risk:** staff-invited adults count from the moment they're invited, before they sign in (decided 28 September 2026, so groups can be set up in advance). `[Mitigation: staff check that invited adults have joined before a group is used with children]` | Accepted | Medium |
| R10 | Report emails to every Safeguarding Admin; admin bell. **Open:** no Safeguarding Admin is assigned yet. `[Assign before launch; state response times and that the app isn't monitored out of hours; members told to call 999 in an emergency]` | Reduced once assigned | Medium |

## Step 8: Sign-off

| Item | Name / date | Notes |
|---|---|---|
| Measures approved by | | |
| Residual risks approved by | | If any residual risk is high, consult the ICO before going ahead |
| DPO / data protection lead advice | | |
| DPO advice accepted or overruled by | | |
| Consultation responses reviewed by | | |
| This DPIA will be kept under review by | | Review before launch, after 3 months, and whenever the processing changes |
