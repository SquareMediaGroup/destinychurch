# Destiny One — draft wording for the privacy notice, terms and safeguarding policy

**Status: DRAFT for review. Not legal advice, and not live.** Written from what the app actually does (`docs/destiny-one-gdpr.md`), so Destiny's leadership, safeguarding lead and data protection adviser have a starting point. Nothing here is published until they sign it off.

**Before any of this goes live:**
- Fill in every `[bracketed]` item. Who holds the safeguarding role comes from the safeguarding policy review (scoping doc D6); the lawful bases come from the DPIA. The minimum age (13) and retention (1 year) were decided on 28 September 2026.
- Add sections A and B to `/privacy` and `/terms` (`app/privacy/page.tsx`, `app/terms/page.tsx`) and the reference copies here (`privacy-policy.txt`, `terms-of-use.txt`). Add section C to `/safeguarding`.
- **Change the notice versions in `REQUIRED_CONSENTS`** (`packages/shared/src/destinyOne/policy.ts`, currently `2026-09`) whenever the published wording changes, so everyone is asked to agree to the new version.
- Check section D, the plain-words version, with a few young people and parents.

---

## A. Privacy notice: new section "The Destiny One app"

**What Destiny One is.** Destiny One is Destiny Church Tees Valley's app for our teams and groups to message each other. It is only for people aged 13 and over whom the church has invited. Destiny Church is the data controller.

**What we hold about you**
- Your **real name**, as the church office has it. You can't change it yourself; ask the church office.
- **Whether you're 18 or over.** If you're under 18 and we know your date of birth, we keep only **the date you turn 18**, never your full date of birth. If you ask to join and give your date of birth, we keep only the date you turn 18 from that too, and the note you wrote.
- **Who approved you** and when.
- Your **email address**, which you use to sign in. Other members never see it.
- The **groups and communities** you're in, including when you joined and left.
- The **messages, photos and files** you send, your **reactions**, and messages you've deleted (see "How long we keep things").
- A **profile picture**, if you choose to add one.
- The notices you've agreed to, and when.
- People you've **blocked**, and reports you've made.
- **Problems and feedback** you send us from the Profile tab, with your app version and phone model.
- **Crash reports**: if the app goes wrong, what went wrong in the app, your phone model and app version, and your member number (not your name or email). Never your messages.
- A **device token** so we can send you notifications.

**What we never collect:** phone numbers, your address, your location, your contacts, or medical information. Photos are re-saved on your phone before they're uploaded, which removes location and other hidden details.

**Why we use it, and our legal basis** `[to confirm in the DPIA]`
- To run the app for church members: our legitimate interests, and for a religious not-for-profit body, UK GDPR Article 9(2)(d) where membership reveals religious belief.
- To keep people safe (the 2-adult rule, reviewing chats when a concern is raised, keeping deleted messages for a time): our legitimate interests and our safeguarding obligations.

**Chats are not end-to-end encrypted.** Our safeguarding team can read a group's messages **if a concern is raised**. Only people with the Safeguarding Admin role can do this: `[name the role holders, e.g. the Designated Safeguarding Lead and their deputy]`. They must give a reason each time, and every look is recorded (who, which group, which dates, why). These records are checked by `[who, how often]`. Staff who run the app day to day cannot read messages.

**Notifications show a preview.** When a message arrives, the notification shows the group name, the sender's name and the first line of the message. It is delivered through Expo (our notification service) and Apple or Google, which are based in the USA, and it can appear on your lock screen. You can stop previews for a group by muting it.

**Who else handles your data (our processors)**

| Company | What for | Where |
|---|---|---|
| Supabase | Stores the app's data, sign-in and files | EU (Ireland) |
| Vercel | Runs the app's server | `[confirm region]` |
| Resend | Sends sign-in codes and invites by email | `[confirm region]` |
| Sentry | Crash reports, so we can fix problems (no names, emails or messages) | EU (Germany) |
| Expo, Apple, Google | Deliver notifications (with a message preview) | USA |
| ChurchSuite (only if it's switched on for you) | Staff sign-in | UK |

We have data processing agreements with each, and transfers to the USA are covered by `[the UK International Data Transfer Addendum / UK Extension to the EU–US Data Privacy Framework — confirm per company]`.

**How long we keep things**
- Messages, photos and files, including ones you delete: **1 year**, then deleted automatically. Deleted messages are hidden from everyone straight away, but we keep them for this time in case they're needed for a safeguarding concern.
- A message that has been reported is kept until the report is dealt with, even if that's longer.
- Closed reports and resolved safeguarding records: 1 year.
- Records of who reviewed a chat: `[365 days, the audit log's retention]`.

**If you delete your account** (in the app: Settings → Delete my account): you leave every group, your name, age, email, profile picture, consents, blocks and device tokens are removed, and your sign-in is deleted. **Your messages stay**, shown as "Former member", until the retention period ends, because they may be needed for safeguarding. Then they're deleted too.

**Your rights.** You can see a copy of everything we hold about you in the app (Settings → Download my data). You can ask us to correct your name or age (ask the church office), delete your account, or object to how we use your data, by contacting `[admin@destinytees.uk]`. You can also complain to the Information Commissioner's Office (ico.org.uk).

**Children.** Young people can use Destiny One from age 13. Under-18s are only ever in groups with at least 2 adults, can only be added by adult leaders, and there's no way to find or message a young person outside a group.

---

## B. Terms of use: new section "Destiny One"

1. **Who can use it.** Destiny One is for people aged 13 and over whom the church has invited. Use your real name. One account per person.
2. **Group chats only.** There are no private one-to-one chats. Every group has at least 3 people, including at least 2 adults. If a group stops meeting that rule, it pauses (you can read, but not post) until it does again.
3. **No phone numbers.** Don't share phone numbers, addresses, or other ways to contact people outside the app, especially with young people.
4. **Be kind and appropriate.** No bullying, harassment, hateful content, sexual content, or anything that puts someone at risk. Don't share photos of other people without their permission, or photos of children without their parent's or carer's permission.
5. **Chats can be reviewed.** Messages aren't end-to-end encrypted. The safeguarding team can read a group's messages if a concern is raised (see the privacy notice).
6. **Reporting and blocking.** Press and hold a message to report it or to block the sender. Reports go to the safeguarding team, and the person isn't told who reported them. Blocking hides someone's messages for you; it doesn't remove them from your groups, and the safeguarding team can still see everything.
7. **What we can do.** We can remove messages, pause groups, and suspend or close accounts that break these terms or put anyone at risk. We'll follow our safeguarding policy, and may involve other agencies where the law requires.
8. **Not for emergencies.** Nobody watches Destiny One around the clock. If someone is in danger, call 999.
9. **Changes.** We'll ask you to agree again if these terms change.

---

## C. Safeguarding policy: new section "Online messaging (Destiny One)"

Destiny One is the church's only approved way for staff and volunteers to message young people in groups. It is designed so that the church's online practice matches the rest of this policy:

- **No one-to-one messaging with anyone**, adult or child. Every group has at least 3 people, including at least 2 verified adults, at all times. A group that stops meeting this pauses automatically, and the safeguarding team is told.
- **Only approved leaders create groups**, and only adults can be leaders or group admins. **Staff confirm every member's identity and age** before they can use the app.
- **No phone numbers or other contact details** are collected or shown.
- **Messages are reviewable.** They aren't end-to-end encrypted, deleted messages are kept for 1 year, and a reported message is kept until the report is closed.
- **Reviewing messages is itself controlled.** Only `[named Safeguarding Admins]` can read a group's messages. Each review needs a written reason and is recorded in an audit log, which `[who]` checks `[how often]`.
- **Reports** go to the Safeguarding Admins by email and in the website admin. They are handled within `[time]` in normal working hours, following the procedure in this policy for any concern. The app is not monitored out of hours; urgent concerns go through the usual emergency routes.
- **Staff and volunteers must not** use personal phone numbers, social media or other apps to message young people from church groups. `[Align with the church's social media and communications policy.]`
- **Photos:** members are asked not to share photos of children without a parent's or carer's permission. The app removes location data from photos automatically.

---

## D. Plain words for young people (for the in-app notice or a parents' leaflet)

- Destiny One is for chatting in your church groups. There are always at least 2 adults in every group, and there are no private chats.
- Use your real name, and don't share your phone number or address.
- Our safeguarding team can read group chats if someone is worried. They have to say why, and it's written down every time.
- If something upsets you or doesn't feel right, press and hold the message and tap **Report**. The person won't find out it was you. You can also **Block** someone so you don't see their messages.
- If you're ever in danger, call 999, and tell an adult you trust.
