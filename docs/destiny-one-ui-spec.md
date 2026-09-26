# Destiny One — screens and flows to design

**For:** the Destiny One app designs (iOS + Android, React Native / Expo, Liquid Glass on iOS 26+).
**Backend:** built and documented. Every screen below lists the data the backend already provides and the call behind each action, so the designs can be wired up directly.

Field names refer to the types in `packages/shared/src/destinyOne/types.ts`. Calls are the methods of the typed client in `packages/shared/src/destinyOne/client.ts` (`api.*`).

---

## Ground rules the designs must respect

These are enforced by the server. The UI only needs to present them honestly.

1. **No one-to-one chats.** There is no "message this person" anywhere. Groups have at least 3 people.
2. **Every group has at least 2 verified adults.** If a group drops below that, or below 3 people, it **pauses**: it becomes read-only and shows a reason. It reopens by itself when the rule is met again. Safeguarding can also pause a group by hand.
3. **No phone numbers anywhere.** No phone field, no SMS codes, no "invite from contacts", and no contact details shown on any profile.
4. **Chats are not end-to-end encrypted and can be reviewed by the safeguarding team.** Don't use lock icons or "encrypted" badges. The onboarding notice says this plainly.
5. **Real names only.** Members can't change their own name; the church office sets it.
6. **Push notifications say only "New message".** No sender, group name or text.
7. **Only leaders see who is under 18**, and only where they need it (building a group).

---

## Flow overview

```
Welcome ─┬─ Email ─ Code ─────────┐
         └─ ChurchSuite (staff) ──┤
                                  ▼
                       api.link() → me.onboarding
        ┌───────────────┬───────────────┬───────────────┬──────────┐
  request_needed   request_submitted   invite_only     suspended   active
        │                 │               │               │          │
  Request form       Waiting screen   Invite-only      Suspended     │
        │                                                            ▼
        └──────────→ Waiting screen                     Notices (if outstandingConsents)
                                                                     │
                                                                     ▼
                                                          Chats (home) ⇄ Group chat
```

Invited people skip the request steps entirely. Signing in with the invited email puts them straight into `active`.

---

## A. Sign-in and onboarding

### A1. Welcome
- **Purpose:** first launch and after sign-out.
- **Shows:** Destiny One name and brand, one line on what it is.
- **Actions:**
  - **Continue with email** → A2
  - **Sign in with ChurchSuite** → A4. Label it for staff and leaders; most members won't have a ChurchSuite login.
- **Note:** no phone option.

### A2. Email entry
- **Shows:** email field and a short privacy line.
- **Action:** **Send code** → `requestEmailCode(email)` (in `src/lib/auth.ts`) → A3.
- **States:** invalid email; sending; rate-limited ("Please wait a minute and try again").

### A3. Code entry
- **Shows:** a 6-digit code input, the email it was sent to, and "Change email".
- **Actions:**
  - **Verify** → `verifyEmailCode(email, code)`, which returns `D1Me` → route on `me.onboarding`
  - **Resend code** (with a cooldown timer)
- **States:** wrong code; expired code; verifying.
- **Note:** don't use the SMS one-time-code autofill.

### A4. Sign in with ChurchSuite
- A system browser sheet opens ChurchSuite's own login (`signInWithChurchSuite()`). The only design needed is a loading state, plus:
- **States:** cancelled (back to A1, no error); failed ("Couldn't sign in with ChurchSuite. Try email instead.").

### A5. Request access (`me.onboarding === "request_needed"`)
- **Purpose:** someone signed in without an invite.
- **Shows:** `me.onboardingMessage` as the intro; fields for **Full name** (required), **Date of birth** (optional, with a line saying staff will confirm their age) and **Anything we should know?** (optional, 500 characters, e.g. "I serve on the Media team").
- **Action:** **Send request** → `api.requestAccess({ name, dateOfBirth, note })` → A6.
- **States:** validation errors from the server `message`.

### A6. Waiting for approval (`request_submitted`)
- **Shows:** `me.onboardingMessage`, **Edit my request** (back to A5, which updates it) and **Sign out**.
- **Behaviour:** re-check with `api.me()` when the app returns to the foreground.

### A7. Invite-only (`invite_only`)
- **Shows:** `me.onboardingMessage` ("ask your team leader or the church office for an invite") and **Sign out**.

### A8. Account suspended (`suspended`)
- **Shows:** `me.onboardingMessage` and **Sign out**. Don't give a reason.

### A9. Notices (when `me.outstandingConsents` is not empty)
- **Purpose:** GDPR and safeguarding transparency. The user **must** accept before chatting.
- **Shows:** three items, each openable in full: **Privacy notice**, **Terms**, and **How your chats are kept safe**. That last one explains that chats are not end-to-end encrypted, the safeguarding team can review them if a concern is raised, deleted messages are kept for a time, and the 2-adult rule.
- **Action:** **I agree** → `api.acceptConsents(me.outstandingConsents)`.
- **Note:** the notices will need re-showing when their versions change. The server tells you which are outstanding.

### A10. Notifications permission explainer
- **When:** in context, right after they first see a group. **Never on first launch.**
- **Shows:** "Get a notification when there's a new message. Notifications never show the message itself." Buttons **Turn on** → `registerForPush()` and **Not now**.

---

## B. Main app

### B1. Chats (home)
- **Data:** `api.communities()` → `D1CommunitySummary[]`, each with its `groups: D1GroupSummary[]`.
- **Shows,** grouped by community:
  - the community's **Announcements** first (`announcementsGroupId`)
  - then its department groups
- **Each row:** group name, department, last-message preview (`lastMessage.preview`, sender name, time; "Photo" or "File" when `hasAttachment`; "Message deleted" when `deleted`), unread badge (`unreadCount`), muted icon (`muted`), and a **paused** indicator when `state === "frozen"`.
- **Live updates:** `subscribeToMe(me.id)` for groups added or removed.
- **States:** loading skeleton; empty ("You're not in any groups yet. Your team leader will add you."); offline banner (E1).
- **Open questions for you:** a tab bar (Chats / Me) or a single screen with a profile button? Should community headers collapse?

### B2. Community
- **Data:** `api.community(id)`.
- **Shows:** name, description, the groups I'm in, and a **Leave community** button (with a confirm explaining it leaves every group in it).
- **Leaders** (`canManage`): **New group** (C1) and **Add people** (C2).

### B3. Group chat
- **Data:** `api.messages(groupId, { before })` pages oldest→newest (`nextBefore` loads older). Live: `subscribeToGroup(groupId)` with events `message`, `message_deleted`, `reaction`, `members_changed` and `group_state`.
- **Header:** group name, department, member count → B6.
- **Message bubble:** sender name (always; these are groups), time, day separators, reply preview (`replyTo`), attachment (`attachment.url`, image thumbnail or file chip), reactions (`reactions[]` with count and `mine`), and "You" styling for `mine`.
- **Deleted message:** a stub "This message was deleted", with no content.
- **Composer:** text (4000 max), attach (image/PDF, 20 MB), and a reply preview bar. `api.send(groupId, { body, replyTo, attachmentId })`.
  - Attachments: `api.requestUpload(...)` → upload → send. Show upload progress and failure.
- **Announcements:** the composer is replaced by "Only admins can post here" for non-admins (`canPost` false).
- **Paused group:** a banner with `frozenReason` plus the composer disabled. Reading still works.
- **Also:** jump-to-latest button, "new messages" divider, and mark read (`api.markRead(groupId, lastId)`) as the user scrolls.
- **States:** loading; empty ("No messages yet. Say hello."); send failed (retry); rate-limited.

### B4. Message actions (long-press sheet)
- **Reply**, **React** (quick row plus more), **Copy**, **Delete**, **Report**.
- **Delete** is shown for your own messages, and for any message if you're a group admin. `api.deleteMessage(id)`, with a confirm saying "Delete for everyone".
- **Report** → B5.

### B5. Report a message
- **Shows:** the quoted message, and a reason (quick picks plus free text, 1000 max).
- **Action:** `api.report(id, reason)` → confirmation: "Thanks. The safeguarding team will look at this. The person won't be told who reported it."

### B6. Group info
- **Data:** `api.group(id)` → `D1GroupDetail`.
- **Shows:** name, department, description, members (name and role; **Admin** badge), and mute options (`api.mute(id, until)`: 8 hours, 1 week, always, off).
- **Leave group** → `api.leaveGroup(id)`, with a confirm noting the group may pause if the rules stop being met.
- **Leaders / admins** (`canManage`): the rules panel `rules` ("5 people, 2 adults — meets the rules"), plus **Add people**, **Manage members** and **Edit group** (C2–C4).

### B7. Attachment viewer
- Full-screen image (pinch-zoom, share sheet) and PDF viewer.

---

## C. Leaders (group_leader / senior_leadership)

### C1. New group
- **Fields:** name, department, description, members (C2 picker).
- **Live rule check:** "4 people, 1 adult — groups need at least 3 people including 2 adults".
- **Action:** `api.createGroup(communityId, {...})`.
- **States:** server rule messages are shown as-is.

### C2. Add people (picker)
- **Data:** `api.directory(query, communityId)` → names plus `isAdult`.
- **Shows:** search, a multi-select list with an **Adult / Under 18** tag (leaders only), and the selected count.

### C3. Manage members
- Per person: **Make admin** (adults only; hidden for under-18s) and **Remove**.
- **Removing:** confirm; if it would pause the group, say so before they confirm.

### C4. Edit / archive group
- Rename, department, description.
- **Archive**, with a confirm: "Hides it for everyone. Messages are kept for safeguarding."

### C5. New community (senior leadership only)
- Name and description. It explains that the Announcements channel opens once 3 people, including 2 adults, have joined.

---

## D. Me

### D1. Me / profile
- **Shows:** name (read-only, with "Ask the church office to change your name"), age status (not shown to others) and leader roles.

### D2. Notifications
- Master switch (links to system settings) plus the per-group mute list.

### D3. Privacy & data
- Read the notices again.
- **Download my data** → `api.exportMyData()`, shared as a JSON file.
- **Delete my account** → a confirm screen explaining what happens: you leave every group; your messages stay under "Former member" for the safeguarding retention period, then are deleted; this can't be undone. The user types DELETE → `api.deleteAccount()` → back to A1.

### D4. Sign out
- `signOut()` → A1.

---

## E. System states (design once, reuse everywhere)

| # | State | Where |
|---|---|---|
| E1 | Offline / reconnecting banner | top of Chats and Group chat |
| E2 | Paused group banner, with reason | Group chat, Group info |
| E3 | Generic error with **Try again** (server `message` shown) | any screen |
| E4 | Rate limited ("You're doing that a lot — try again in a few minutes") | send, report, invites |
| E5 | Forced update (app too old) | full screen, if we use `minSupportedBuild` |
| E6 | Loading skeletons: chat list, message list | B1, B3 |
| E7 | Empty states | B1, B3, C2 |

---

## F. Open questions for you

1. **Emoji reactions vs the "no emojis in UI" rule.** The repo's rule bans emojis in the interface. Reactions are user content rather than UI chrome, but a reaction picker is an emoji UI. Do we keep reactions, use a fixed set of text or icon reactions, or drop them?
2. **Navigation:** a tab bar (Chats / Me) or a single chat list with a profile button?
3. **Leader invites from the app:** should group leaders be able to invite people by email from the app, or only staff from the website? This isn't built yet; the website does it today.
4. **Standalone or part of a church app:** is Destiny One its own app, or will the content app (sermons, events, give) live inside it later?
5. **Brand:** the app icon, splash screen and colours. The skeleton uses Expo placeholders; the website's brand tokens are in `packages/shared/src/design/tokens.ts`.

When you send the images, name them with the screen IDs above (for example `B3-group-chat.png`, `B3-group-chat-paused.png`) so each maps straight to its data and actions.
