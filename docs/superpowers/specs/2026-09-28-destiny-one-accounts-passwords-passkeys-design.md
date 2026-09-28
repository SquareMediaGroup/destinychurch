# Destiny One: accounts, passwords, passkeys, quick switching, send-as

Status: draft for review, 2026-09-28. Branch `feature/destiny-one-accounts-passwords`, stacked on PR #35
(`feature/destiny-one-account-switching`).

## Intent

A person (typically a parent, or a leader with a staff account) keeps several Destiny One accounts on one
phone and moves between them almost instantly. Sign-in gains passwords and, later, passkeys so adding and
re-entering an account is quick. Safeguarding rules do not change: every account is still a real,
staff-approved member with its own Supabase user.

Said by the product owner: Profile gets "Add account" under the name with "Add child" and "Add admin
account"; "Add child" means signing in to the child's own existing account; passwords and passkeys are
coming; double-pressing the Profile tab switches profiles with a banner "Switched to X profile" showing the
profile picture; holding Send sends as another signed-in account, with haptics; only the active account
receives notifications.

## Starting point (already built in PR #35, unmerged)

One Supabase client and Keychain slot per account (`src/lib/accounts.ts`), per-member saved cache, push
follows the active account, Face ID/passcode before switching (`confirmOwner`), `/accounts` sheet, hold the
Settings tab to open it, "Add account" via the email code into a pending slot. Max 5 accounts.

PR #35 predates the Settings-to-Profile rename (#42) and now conflicts with `main` in
`src/lib/auth.ts` and `src/state/session.tsx`. Step 0 of the build is to merge `main` into this branch and
resolve those, and PR #35 is then closed in favour of this branch (or merged first, at the owner's choice).

## Scope

Phase 1 (JS only, ships over the air): rename fixes, Add account (child/admin), passwords, double-press
switch with banner, send-as. Phase 2 (native rebuild, raised minimum build): passkeys.

### 1. Profile: Add account

Under the name card, a row "Add account" opens a sheet with two choices:

- **Add child.** Opens sign-in in add mode. After sign-in the server (`auth/link` result, `D1Me.isAdult`)
  must say the account is under 18; otherwise the slot is discarded with "That account isn't a child
  account." The child signs in with their own credentials (password, or the email code sent to the
  child's email).
- **Add admin account.** Same flow. The account must have staff access; `D1Me` gains `isStaff: boolean`
  (true when the auth user has `destiny_one_admin` or a safeguarding role in `admin_roles`), computed
  server-side. Otherwise discarded with "That account doesn't have admin access."
- The choice is stored on the slot as `kind: "member" | "child" | "admin"` (display label only, shown as a
  small tag in the switcher). It is a label, never a permission; nothing is granted by adding an account.
- Existing "Switch account" row and hold-tab sheet remain; "Add another account" inside `/accounts` opens
  the same two-choice sheet.
- Add mode never touches the current session until the new one has passed `auth/link` and the age/staff
  check (PR #35's pending-slot mechanism).

### 2. Passwords (phase 1)

- Sign-in screen: email, then "Use password" or "Email me a code". Codes remain the fallback and the reset.
- Sign in with `signInWithPassword` on the slot's client, then `api.link()` as today. Approval, invite-only
  and suspension rules are unchanged because `auth/link` still runs.
- Wrong email and wrong password show one generic message, so the app never reveals who is a member.
- Profile: "Set password" / "Change password" via `auth.updateUser({ password })`, after a fresh email-code
  or password check. Minimum length 10; Supabase leaked-password protection turned on (project setting, done
  through the dashboard or Management API, recorded in the docs).
- Rate limiting is Supabase's per-IP limit on direct password sign-in. No new server route in phase 1.
- Staff accounts already share `auth.users` with the website login, so an existing staff password works.

### 3. Quick switch: double-press Profile tab

- Double-pressing the Profile tab (second tap within 300 ms) switches to the next saved account in a fixed
  order (most recently used first); with two accounts it toggles. A single press still opens Profile.
  Holding the Profile tab still opens `/accounts`.
- Face ID/passcode: PR #35 asks before every switch. Double-press needs to be fast, so the check applies
  only when the device has an enrolled passcode AND the target account was last used more than 60 seconds
  ago (`confirmOwner` gains a grace window). Decision for the owner: keep the prompt on every switch
  instead? (Default: grace window as stated.)
- On success: `haptic.selection()`, then a banner slides down from the top: profile picture (or initials
  avatar) and "Switched to {displayName} profile", auto-dismiss after 2.5 s, tap to dismiss, respects Reduce
  Motion (fade instead of slide), announced to screen readers. Built as `SwitchBanner` mounted once in the
  root layout, driven by a small `switchNotice` state emitted from `accounts.activate`.
- A target whose saved session was rejected is skipped, and the banner reads "Sign in again to {name}"
  and opens sign-in for that email.

### 4. Send as another account

- In a group chat, holding Send (~350 ms, after there is text or an attachment) fires `haptic.press()` and
  opens a small menu above the button listing the other signed-in accounts (picture, name, kind tag),
  each with a checkmark if selected. The default Send tap always sends as the active account.
- Choosing an account fires `haptic.selection()` and sends that message as that account, then
  `haptic.sent()`. It does not switch the active account and does not change which chat is open.
- Owner ruling 2026-09-28: send-as works for member and admin accounts, never child accounts. A child
  account (labelled child, or simply under 18) is never offered in the menu, and holding Send from a
  child account does nothing.
- Only accounts that are current members of this group are offered (membership checked against that
  account's own `me`/communities cache; the server still enforces it, because the message is posted with
  that account's own access token). If no other account is a member, the hold does nothing.
- Mechanism: `api.sendMessage` gains an optional `asSlot`. The request uses that slot's client access token
  (`accounts.accessToken(slot)`) and that member's id; the server sees an ordinary send by that member.
  The sent message is then applied to the target account's cache (message list for that group) and shows in
  the current view as sent by that account's sender name.
- Audit and safeguarding: authorship is the true sender account, so reports, transcripts and the 2-adult
  rule behave exactly as if that account sent from its own phone.
- Not offered for polls/events/attachments in v1 (text and photo/PDF only if the existing send path takes an
  arbitrary token; otherwise text only, decided during planning by reading `useConversation`).

### 5. Passkeys (phase 2)

- App: `react-native-passkey` (native; dev-client rebuild; raise `minBuild` in `d1_settings` via the update
  gate before shipping).
- Server: `@simplewebauthn/server`. New table `d1_passkeys` (id, auth_user_id, credential_id unique,
  public_key, counter, transports, name, created_at, last_used_at), deny-all RLS, service-role functions
  only. Routes `auth/passkey/register-options`, `register`, `login-options`, `login`; challenge stored
  server-side with a 5 minute expiry, single use.
- Login: verify the assertion, then mint a session through `generateLink` and `verifyOtp` exactly like the
  ChurchSuite exchange, then `auth/link` as always.
- Profile: "Passkeys" list (add on this device, name, remove). Removal needs a fresh sign-in.
- **Blocking decision for the owner:** the relying-party domain. It must serve
  `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` and can never change without
  invalidating every passkey. `destinytees.uk` is still WordPress; the API is `destinychurch.vercel.app`.
  Pick one before phase 2 starts.

### 6. Notifications

Only the active account receives pushes (PR #35 behaviour, kept). Switching or send-as never moves the
token. Documented so nobody expects a badge for an inactive account.

## Data and API changes

- Phase 1: `D1Me.isStaff` (shared types + `auth/link`/`me` route). No migration.
- Phase 2: migration for `d1_passkeys`, four routes, docs.
- `REPOSITORY_DOCUMENTATION.md`: new components (`SwitchBanner`, `AddAccountSheet`, `SendAsMenu`), API
  routes, libraries (`accounts.ts`, passkey helpers), schema, Destiny One section.

## Error handling

- Rejected slot token: mark "Sign in again", never delete.
- Add-child/add-admin mismatch: discard the pending slot, current account untouched.
- Send-as failure (token expired, no longer a member): message stays in that group's composer as a draft
  with an inline error; no partial state in the other account's cache.
- Offline: switching works from cache; send-as queues nothing and errors as a normal send does.

## Testing

- Unit tests (`accounts` store): save, activate, order for double-press, rejected token, remove, grace
  window, kind tagging, max accounts.
- Unit tests: child/admin check functions given `D1Me` fixtures; generic sign-in error mapping.
- Server: `isStaff` derivation test; (phase 2) WebAuthn verification and challenge single-use tests, plus
  SQL rule test that `d1_passkeys` is deny-all.
- Manual on simulator with the test login plus a second account: double-press switch and banner, hold-send
  menu, add child/admin, password set and sign-in. Typecheck, lint, `expo-doctor`.

## Open decisions for the owner

1. ~~Send-as from a child account~~ Decided: not allowed; admin accounts are.
2. ~~Face ID grace window~~ Decided: Face ID on double press, but not every time (60 s grace).
3. Passkey relying-party domain (blocks phase 2 only).
4. ~~PR #35~~ Decided: merge #35 first (after resolving its conflicts with main), then build on it.
