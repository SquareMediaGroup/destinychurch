# Destiny One — guide for staff

**For:** Destiny One Admins (who run the app) and Safeguarding Admins (who handle reports and review chats).
**Where:** the website admin, under **Destiny One** (`/admin/destiny-one`).
**Status:** draft for the launch. Check it against the signed-off safeguarding policy before sharing.

> **If someone may be in danger right now, call 999 first.** Then tell the Designated Safeguarding Lead. Destiny One is not an emergency service, and nothing in it replaces the church's safeguarding procedure.

---

## 1. Who does what

| Role | Can | Can't |
|---|---|---|
| **Destiny One Admin** | Approve people, send invites, set names and ages, make leaders, build communities and groups, change app settings | Read any message |
| **Safeguarding Admin** | See reports, pauses and blocks, open a conversation (with a reason, recorded), remove a message, suspend or reinstate someone, pause a group | Nothing more: keep this role to as few people as possible |

A super admin can do both. Every action is written to the audit log (`/admin/audit`).

## 2. The rules the app enforces for you

You don't have to police these. The app won't let anyone break them.

- There are **no one-to-one chats**. Every group has at least 3 people.
- **Every group needs at least 2 adults.** If a group drops below 3 people or 2 adults (someone leaves, is removed or suspended), it **pauses**: everyone can still read it, but no one can post. The Destiny One Admins and Safeguarding Admins get a notification. It reopens by itself when the rule is met again.
- Only leaders can create groups. Only adults can be leaders or group admins.
- There are **no phone numbers** anywhere.
- Chats are **not end-to-end encrypted**. Members are told this, and that the safeguarding team can review chats if a concern is raised.

## 3. Letting people in (Destiny One Admin)

**Invites** (`Invites`): enter the person's email, their real name, whether they're an adult (and, for an under-18, their date of birth if you have it), any leader role, and which communities they join. They're in as soon as they sign in with that email. Revoking an invite before they sign in removes them again.

**Access requests** (`Access requests`, and the notification bell): people who signed in without an invite and asked to join. Each shows the name, the date of birth *they typed in* (not proof), and any note. When you approve, **you decide** whether they're an adult or under 18. That decision is what the 2-adult rule uses, so check it against what the church knows. "Decline" suspends them so they don't keep reappearing.

**Leader invites from the app**: a leader can invite someone by email from a group. That person becomes an access request marked "Invited by …". You still confirm their age before they join the group.

**Invite-only or open**: `App settings → Let people ask to join`. Off means only invited people can get in.

## 4. Communities and groups (Destiny One Admin)

A **community** has an **Announcements** group everyone in it is in (only admins post there), plus department groups. You can create both on the website, add or remove people, and make someone a group admin (adults only).

**A paused group** shows in `Paused groups`. Usually someone left and it needs another adult. Add an adult to the group and it reopens automatically. If Safeguarding paused it by hand, only Safeguarding can lift it.

## 5. When something is reported (Safeguarding Admin)

1. **You'll get an email** saying a message was reported (it contains no details), plus a notification in the admin bell.
2. Open **Destiny One → Safeguarding → Reports**. You'll see who reported it, why, and the message itself, even if the sender has since deleted it.
3. Decide what to do. You can:
   - **Review conversation**: read the whole group for a period. You must give a reason, and your name, the reason and the dates are recorded in the audit log. Open only what you need, for the shortest period that answers the concern.
   - **Remove message**: takes it down for everyone ("This message was deleted"). The content is kept for review until the retention period ends.
   - **Suspend sender**: they can't use Destiny One until reinstated. Any group left under the rules pauses by itself.
   - **Pause** the whole group (`All groups` tab) while you look into something. Members see your reason, so keep it neutral ("Paused while the church team looks into something").
4. **Close report** with a short note on what was done. The note stays with the report.
5. Follow the church's safeguarding procedure for anything that needs a referral, and record it where the policy says, not only in Destiny One.

The person who was reported is never told who reported them.

## 6. Blocks (Safeguarding Admin)

Members can block each other. That hides the other person's messages and notifications for them only. Nobody leaves a group and nothing is hidden from you. Every block is listed under **Safeguarding → Blocks**. A child blocking an adult, or several people blocking the same person, is worth a look.

## 7. Accounts and data

- **Names are set by staff.** Members can't change their own name. If it's wrong, correct it in `Members`.
- **Deleting an account** (by the member in the app, or by you in `Members`) removes them from every group and anonymises them as "Former member". Their messages stay, for the safeguarding retention period, then are deleted.
- **Download my data**: members can download what Destiny One holds about them from the app's Settings. If someone asks the church office instead, point them there, or ask the site administrator.
- **Retention**: messages are deleted automatically after the agreed retention period. A message under an **open** report is kept until the report is closed, so close reports once they're dealt with.

## 8. App versions and maintenance (Destiny One Admin)

`App settings → App versions`: raising "Lowest iOS/Android build allowed" makes everyone on an older build update before they can carry on. Use it to retire a broken build.

`App settings → Maintenance`: a message here takes the whole app offline for everyone and shows that message instead. Clear it to bring the app back.

## 9. Out of hours

Report emails arrive whenever a report is made, but nobody is expected to watch Destiny One around the clock. Say this plainly to members and parents. The in-app "How your chats are kept safe" notice doesn't promise live monitoring, and nothing you say should either. **Anything urgent goes through the normal safeguarding and emergency routes, not the app.**
