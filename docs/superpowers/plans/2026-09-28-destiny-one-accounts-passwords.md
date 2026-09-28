# Destiny One: add account, passwords, quick switch, send-as — Implementation Plan (phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one phone hold several Destiny One accounts (child and admin accounts added from Profile), sign in with a password, switch by double-pressing the Profile tab with a "Switched to X profile" banner, and send a message as another signed-in account by holding Send.

**Architecture:** Build on PR #35's slot model (one Supabase client + Keychain session per account, `src/lib/accounts.ts`). All decision logic (which account is next, whether Face ID is needed, who may send-as, whether an added account is a valid child/admin, password rules) lives in one pure module in `@destiny/shared` so it is unit-tested with the repo's Playwright `unit` project. UI tasks are thin wiring over it. No database migration in phase 1.

**Tech Stack:** Expo SDK 57 / React Native 0.86 / expo-router, `@supabase/supabase-js`, `expo-haptics`, `expo-local-authentication` (already in PR #35), Next.js route handlers, Playwright unit tests.

**Spec:** `docs/superpowers/specs/2026-09-28-destiny-one-accounts-passwords-passkeys-design.md`

**Out of scope here:** passkeys (spec section 5). They need a native module, a minimum-build raise and a decision on the relying-party domain, and get their own plan once that domain is chosen.

## Global Constraints

- Never push to `main`; work is on `feature/destiny-one-accounts-passwords`, PR into `main` (or after #35, per the owner). PRs need approval before merge.
- No emojis in UI (labels, alerts, banner). Emojis are fine in logs and markdown.
- Anton font is homepage-only; use `fontWeight` (e.g. "600") in the app as existing screens do.
- Buttons: use `components/ui` primitives; never override padding via className/style hacks on `Button` (web). In the app use `PrimaryButton`, `TextButton`, `SettingsRow` from `@/components/ui`.
- Maximum accounts on a device: `MAX_ACCOUNTS = 5` (from PR #35).
- Double-press window: 300 ms. Banner shows 2.5 s. Hold-to-send-as delay: 350 ms. Owner-check grace: 60 000 ms (owner confirmed: Face ID on double press, but not every time). Minimum password length: 10.
- Banner wording exactly: `Switched to {displayName} profile`.
- Send-as is for member and admin accounts only, never child accounts (owner ruling 2026-09-28): a child account can't be sent as, and can't send as others.
- Only the active account gets push notifications (unchanged from #35).
- Safeguarding rules are untouched: every sign-in still runs `api.link()` (`auth/link`); no phone numbers anywhere.
- Update `REPOSITORY_DOCUMENTATION.md` for new components, libraries and the `isStaff` field (Task 8).
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

1. Add child with an adult's account, or add admin with a non-staff account: must discard the pending slot and leave the current account untouched (Task 4 tests the rule; Task 4 wiring removes the slot).
2. Send-as: a child account (labelled, or simply under 18) must never be offered, and a child account must never be able to open the menu (Task 1 tests); an account that is not a member of the group, or whose saved session expired: must not send and must say why, never fall back to sending as the active account (Task 7 `sendAsCandidates` test plus error path).
3. Double-press with only one saved account, or a rejected saved session: must do nothing harmful (banner says to sign in again) and never sign anyone out (Task 1 `nextSlot` tests, Task 6).
4. Wrong email versus wrong password: must show one identical message so membership is never revealed (Task 5 test).
5. Password shorter than 10 characters, whitespace-only, or equal to the email: rejected before any network call (Task 1 tests).

## File Structure

- Create `packages/shared/src/destinyOne/accountRules.ts` — all pure rules (Task 1). Exported from the shared index.
- Create `tests/unit/destiny-one-accounts.spec.ts` — unit tests for it.
- Modify `packages/shared/src/destinyOne/types.ts` — `D1Me.isStaff`.
- Modify `lib/destinyOne/auth.server.ts` — compute `isStaff` in `toMe`.
- Modify `apps/destiny-one/src/lib/accounts.ts` — `kind`, `lastUsedAt`, `apiFor(slot)`, `switchNotice`, owner-check grace.
- Create `apps/destiny-one/src/components/SwitchBanner.tsx` — top banner.
- Create `apps/destiny-one/src/components/AddAccountSheet.tsx` — the two-choice sheet.
- Create `apps/destiny-one/src/components/SendAsMenu.tsx` — hold-send menu.
- Create `apps/destiny-one/src/app/password.tsx` — password sign-in screen.
- Create `apps/destiny-one/src/app/set-password.tsx` — set/change password.
- Modify `apps/destiny-one/src/app/email.tsx`, `src/lib/auth.ts`, `src/state/session.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/profile.tsx`, `src/app/accounts.tsx`, `src/app/_layout.tsx`, `src/components/Composer.tsx`, `src/lib/useConversation.ts`, and the group conversation screen.

---

### Task 0: Bring PR #35's branch up to date with main

**Files:**
- Modify (conflicts): `apps/destiny-one/src/lib/auth.ts`, `apps/destiny-one/src/state/session.tsx`
- Modify (rename fallout): `apps/destiny-one/src/app/(tabs)/settings.tsx` -> `profile.tsx`, `apps/destiny-one/src/app/(tabs)/_layout.tsx`, `apps/destiny-one/src/app/email.tsx`

**Interfaces:**
- Produces: a branch where the PR #35 slot model coexists with main's `api.requestCode` (auth/code) flow and the Profile tab; `npm run typecheck` in `apps/destiny-one` passes.

- [ ] **Step 1: Merge main and list conflicts**

```bash
cd "/Users/kaimathema/Downloads/Projects/Square Media Group/destinychurch/.claude/worktrees/accounts-auth"
git fetch origin && git merge origin/main --no-edit; git status --short | grep '^UU\|^AA\|^DU\|^UD'
```
Expected: conflicts in `auth.ts` and `session.tsx` (and possibly `settings.tsx`/`profile.tsx`).

- [ ] **Step 2: Resolve `auth.ts`**

Keep main's `requestEmailCode` (calls `api.requestCode`), and keep the branch's slot-aware verification: `verifyEmailCode` must call `signInClient().auth.verifyOtp(...)` then `signInApi.link()` (not the bare `supabase`/`api`), and ChurchSuite's `verifyOtp` likewise uses `signInClient()`. `signOut` keeps the branch's version. Delete any import of the removed `supabase` singleton.

- [ ] **Step 3: Resolve `session.tsx`**

Keep the branch's slot logic (`runSwitch`, `switchTo`, `finishAdding`, `accounts.*`). Take main's changes elsewhere (for example the `routeFor` `/waiting` cases and the Profile naming). Where main calls `supabase.auth.*`, use `accounts.client().auth.*`.

- [ ] **Step 4: Rename Settings to Profile in PR #35's additions**

In `(tabs)/_layout.tsx` the long-press check `route.name === "settings"` becomes `route.name === "profile"`, and the hint "Hold to switch account" stays. In the Profile screen keep the "Switch account" row from PR #35. Comments that say "Settings" become "Profile" (`accounts.tsx` header, `app.json` Face ID text is fine as is).

- [ ] **Step 5: Fix email.tsx**

Main's email screen no longer calls `api.checkEmail`. Take main's version of the file entirely (`git checkout --theirs apps/destiny-one/src/app/email.tsx` if it conflicts), then re-apply only the branch's add-mode behaviour if any (none is needed here; `code.tsx` already handles `isAdding()`).

- [ ] **Step 6: Typecheck and lint**

```bash
cd apps/destiny-one && npm run typecheck && npm run lint
```
Expected: PASS (warnings from React Compiler rules are allowed, per `eslint.config.js`).

- [ ] **Step 7: Commit the merge**

```bash
git add -A && git commit -m "Merge main into the account-switching branch

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Pure account rules (shared) with tests

**Files:**
- Create: `packages/shared/src/destinyOne/accountRules.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from "./destinyOne/accountRules";` next to the other destinyOne exports)
- Test: `tests/unit/destiny-one-accounts.spec.ts`

**Interfaces:**
- Produces (exact):
```ts
export type AccountKind = "member" | "child" | "admin";
export const DOUBLE_PRESS_MS = 300;
export const OWNER_GRACE_MS = 60_000;
export const MIN_PASSWORD_LENGTH = 10;
export const SIGN_IN_FAILED = "That email or password isn't right.";
export function isDoublePress(previous: number | null, now: number, windowMs?: number): boolean;
export function checkAddedAccount(kind: AccountKind, me: { isAdult: boolean; isStaff: boolean }): { ok: true } | { ok: false; message: string };
export function nextSlot(accounts: { slot: string; lastUsedAt: number }[], activeSlot: string): string | null;
export function needsOwnerCheck(o: { enrolled: boolean; lastUsedAt: number | undefined; now: number; graceMs?: number }): boolean;
export interface SendAsAccount { slot: string; kind: AccountKind; isAdult: boolean }
export function canSendAs(active: { kind: AccountKind; isAdult: boolean } | undefined): boolean; // false when the active account is a child
export function sendAsCandidates<T extends SendAsAccount>(accounts: T[], activeSlot: string, memberSlots: ReadonlySet<string>): T[]; // never a child account
export function switchedNoticeText(displayName: string): string;
export function validateNewPassword(password: string, email: string | null): string | null; // null = fine, else a message
export function hasStaffAccess(row: { destiny_one_admin?: boolean | null; safeguarding_admin?: boolean | null; super_admin?: boolean | null } | null | undefined): boolean;
```

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/destiny-one-accounts.spec.ts
import { test, expect } from "@playwright/test";
import {
  DOUBLE_PRESS_MS,
  OWNER_GRACE_MS,
  SIGN_IN_FAILED,
  checkAddedAccount,
  hasStaffAccess,
  isDoublePress,
  needsOwnerCheck,
  nextSlot,
  canSendAs,
  sendAsCandidates,
  switchedNoticeText,
  validateNewPassword,
} from "../../packages/shared/src/destinyOne/accountRules";

test.describe("double press", () => {
  test("two taps inside the window count", () => {
    expect(isDoublePress(1000, 1000 + DOUBLE_PRESS_MS - 1)).toBe(true);
  });
  test("a slow second tap, or no first tap, does not", () => {
    expect(isDoublePress(1000, 1000 + DOUBLE_PRESS_MS + 1)).toBe(false);
    expect(isDoublePress(null, 1000)).toBe(false);
  });
});

test.describe("adding a child or admin account", () => {
  test("a child must be under 18", () => {
    expect(checkAddedAccount("child", { isAdult: false, isStaff: false })).toEqual({ ok: true });
    const r = checkAddedAccount("child", { isAdult: true, isStaff: false });
    expect(r.ok).toBe(false);
  });
  test("an admin account must have staff access", () => {
    expect(checkAddedAccount("admin", { isAdult: true, isStaff: true })).toEqual({ ok: true });
    const r = checkAddedAccount("admin", { isAdult: true, isStaff: false });
    expect(r).toEqual({ ok: false, message: "That account doesn't have admin access." });
  });
  test("a plain member account is always fine", () => {
    expect(checkAddedAccount("member", { isAdult: true, isStaff: false })).toEqual({ ok: true });
  });
});

test.describe("next account to switch to", () => {
  const list = [
    { slot: "a", lastUsedAt: 10 },
    { slot: "b", lastUsedAt: 30 },
    { slot: "c", lastUsedAt: 20 },
  ];
  test("is the most recently used other account", () => {
    expect(nextSlot(list, "a")).toBe("b");
    expect(nextSlot(list, "b")).toBe("c");
  });
  test("toggles between two accounts", () => {
    expect(nextSlot(list.slice(0, 2), "a")).toBe("b");
    expect(nextSlot(list.slice(0, 2), "b")).toBe("a");
  });
  test("is null with a single account", () => {
    expect(nextSlot([{ slot: "a", lastUsedAt: 1 }], "a")).toBeNull();
    expect(nextSlot([], "a")).toBeNull();
  });
});

test.describe("owner check", () => {
  const now = 1_000_000;
  test("skipped when the device has no passcode", () => {
    expect(needsOwnerCheck({ enrolled: false, lastUsedAt: undefined, now })).toBe(false);
  });
  test("skipped inside the grace window, required after it", () => {
    expect(needsOwnerCheck({ enrolled: true, lastUsedAt: now - OWNER_GRACE_MS + 1, now })).toBe(false);
    expect(needsOwnerCheck({ enrolled: true, lastUsedAt: now - OWNER_GRACE_MS - 1, now })).toBe(true);
  });
  test("required for an account never used on this device", () => {
    expect(needsOwnerCheck({ enrolled: true, lastUsedAt: undefined, now })).toBe(true);
  });
});

test.describe("send as", () => {
  const a = { slot: "a", kind: "member" as const, isAdult: true };
  const admin = { slot: "b", kind: "admin" as const, isAdult: true };
  const child = { slot: "c", kind: "child" as const, isAdult: false };
  const unlabelledMinor = { slot: "d", kind: "member" as const, isAdult: false };
  const accts = [a, admin, child, unlabelledMinor];
  test("offers other member and admin accounts that are in the group", () => {
    expect(sendAsCandidates(accts, "a", new Set(["a", "b"]))).toEqual([admin]);
  });
  test("never offers a child account, labelled or not", () => {
    expect(sendAsCandidates(accts, "a", new Set(["a", "b", "c", "d"]))).toEqual([admin]);
  });
  test("offers nothing when no other account is a member", () => {
    expect(sendAsCandidates(accts, "a", new Set(["a"]))).toEqual([]);
    expect(sendAsCandidates(accts, "a", new Set())).toEqual([]);
  });
  test("a child account can't send as anyone", () => {
    expect(canSendAs(child)).toBe(false);
    expect(canSendAs(unlabelledMinor)).toBe(false);
    expect(canSendAs(a)).toBe(true);
    expect(canSendAs(admin)).toBe(true);
    expect(canSendAs(undefined)).toBe(false);
  });
});

test("banner wording", () => {
  expect(switchedNoticeText("Amy Reed")).toBe("Switched to Amy Reed profile");
});

test.describe("new password", () => {
  test("accepts ten or more characters", () => {
    expect(validateNewPassword("correct-horse-9", "a@b.co")).toBeNull();
  });
  test("rejects short, blank, and email-equal passwords", () => {
    expect(validateNewPassword("short", null)).toMatch(/at least 10/);
    expect(validateNewPassword("          ", null)).not.toBeNull();
    expect(validateNewPassword("Amy@Example.com", "amy@example.com")).not.toBeNull();
  });
});

test("one message for every failed sign-in", () => {
  expect(SIGN_IN_FAILED).toBe("That email or password isn't right.");
});

test.describe("staff access", () => {
  test("any of the three roles counts", () => {
    expect(hasStaffAccess({ destiny_one_admin: true })).toBe(true);
    expect(hasStaffAccess({ safeguarding_admin: true })).toBe(true);
    expect(hasStaffAccess({ super_admin: true })).toBe(true);
  });
  test("no row, or no roles, does not", () => {
    expect(hasStaffAccess(null)).toBe(false);
    expect(hasStaffAccess({ destiny_one_admin: false, safeguarding_admin: null })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (repo root): `npx playwright test --project=unit tests/unit/destiny-one-accounts.spec.ts`
Expected: FAIL, cannot resolve `accountRules`.

- [ ] **Step 3: Implement**

```ts
// packages/shared/src/destinyOne/accountRules.ts
// The pure rules behind having several Destiny One accounts on one phone.
// No React, no Supabase: the app's screens and the server both lean on these,
// and tests/unit/destiny-one-accounts.spec.ts pins them.

export type AccountKind = "member" | "child" | "admin";

/** Two Profile-tab taps this close together are a double press. */
export const DOUBLE_PRESS_MS = 300;
/** Switching back to an account used this recently skips the Face ID check. */
export const OWNER_GRACE_MS = 60_000;
export const MIN_PASSWORD_LENGTH = 10;
/** Wrong email and wrong password look identical, so nobody learns who is a member. */
export const SIGN_IN_FAILED = "That email or password isn't right.";

export function isDoublePress(previous: number | null, now: number, windowMs = DOUBLE_PRESS_MS): boolean {
  return previous !== null && now - previous <= windowMs;
}

/** "Add child" needs an under-18 account; "Add admin account" needs staff access. A label, never a permission. */
export function checkAddedAccount(
  kind: AccountKind,
  me: { isAdult: boolean; isStaff: boolean },
): { ok: true } | { ok: false; message: string } {
  if (kind === "child" && me.isAdult) return { ok: false, message: "That account isn't a child account." };
  if (kind === "admin" && !me.isStaff) return { ok: false, message: "That account doesn't have admin access." };
  return { ok: true };
}

/** Double press goes to the most recently used other account, so two accounts simply toggle. */
export function nextSlot(accounts: { slot: string; lastUsedAt: number }[], activeSlot: string): string | null {
  const others = accounts.filter((a) => a.slot !== activeSlot);
  if (others.length === 0) return null;
  return others.reduce((best, a) => (a.lastUsedAt > best.lastUsedAt ? a : best)).slot;
}

/** Face ID / passcode before switching, unless the device has none or the account was used a moment ago. */
export function needsOwnerCheck(o: { enrolled: boolean; lastUsedAt: number | undefined; now: number; graceMs?: number }): boolean {
  if (!o.enrolled) return false;
  if (o.lastUsedAt === undefined) return true;
  return o.now - o.lastUsedAt > (o.graceMs ?? OWNER_GRACE_MS);
}

export interface SendAsAccount {
  slot: string;
  kind: AccountKind;
  isAdult: boolean;
}

/** A child account is one labelled as such or simply under 18: the label alone must not be a way round the rule. */
const isChild = (a: { kind: AccountKind; isAdult: boolean }) => a.kind === "child" || !a.isAdult;

/** Whether holding Send may offer other accounts at all: never from a child account. */
export function canSendAs(active: { kind: AccountKind; isAdult: boolean } | undefined): boolean {
  return active !== undefined && !isChild(active);
}

/** Other accounts that are in this group and may send in place of the active one. Child accounts are never offered. */
export function sendAsCandidates<T extends SendAsAccount>(accounts: T[], activeSlot: string, memberSlots: ReadonlySet<string>): T[] {
  return accounts.filter((a) => a.slot !== activeSlot && memberSlots.has(a.slot) && !isChild(a));
}

export function switchedNoticeText(displayName: string): string {
  return `Switched to ${displayName} profile`;
}

/** Null when the password is acceptable, otherwise what to tell the person. */
export function validateNewPassword(password: string, email: string | null): string | null {
  if (password.trim().length === 0) return "Choose a password.";
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (email && password.toLowerCase() === email.toLowerCase()) return "Your password can't be your email address.";
  return null;
}

/** Staff access to the admin side, for labelling an added "admin account". */
export function hasStaffAccess(
  row: { destiny_one_admin?: boolean | null; safeguarding_admin?: boolean | null; super_admin?: boolean | null } | null | undefined,
): boolean {
  return Boolean(row?.destiny_one_admin || row?.safeguarding_admin || row?.super_admin);
}
```

Add to `packages/shared/src/index.ts`: `export * from "./destinyOne/accountRules";`

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test --project=unit tests/unit/destiny-one-accounts.spec.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src tests/unit/destiny-one-accounts.spec.ts
git commit -m "Destiny One: pure rules for accounts, switching, send-as and passwords

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `D1Me.isStaff` on the server

**Files:**
- Modify: `packages/shared/src/destinyOne/types.ts` (D1Me, after `isAdult`)
- Modify: `lib/destinyOne/auth.server.ts` (`toMe`, ~line 141)

**Interfaces:**
- Consumes: `hasStaffAccess` (Task 1).
- Produces: `D1Me.isStaff: boolean`, present on every `auth/link` and `me` response.

- [ ] **Step 1: Add the field to the type**

In `D1Me`, after `isAdult: boolean;`:
```ts
  /** Has staff access to the admin side (Destiny One or Safeguarding Admin, or Super Admin). Only used to check an "Add admin account". */
  isStaff: boolean;
```

- [ ] **Step 2: Typecheck to find every place that builds a D1Me**

Run (repo root): `npx tsc --noEmit`
Expected: errors where a `D1Me` is constructed (at least `toMe`, possibly fixtures). Fix each by adding `isStaff`.

- [ ] **Step 3: Compute it in `toMe`**

Open `lib/destinyOne/auth.server.ts`, find how it already gets a service client (the file loads `loadConsents` and settings with one), and add, inside `toMe` alongside the existing `Promise.all`:

```ts
  const staff = member.auth_user_id
    ? (await service.from("admin_roles").select("destiny_one_admin, safeguarding_admin, super_admin").eq("auth_user_id", member.auth_user_id).maybeSingle()).data
    : null;
```
(use the same service-client variable/import the file already uses for its other queries; `admin_roles` is service-only RLS), and in the returned object:
```ts
    isStaff: hasStaffAccess(staff),
```
Import `hasStaffAccess` from `@destiny/shared`.

- [ ] **Step 4: Typecheck and run existing Destiny One unit tests**

Run: `npx tsc --noEmit && npx playwright test --project=unit tests/unit/destiny-one-*.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared lib/destinyOne
git commit -m "Destiny One: tell the app whether an account has staff access

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: accounts.ts — kind, last used, per-slot API, switch notice, owner-check grace

**Files:**
- Modify: `apps/destiny-one/src/lib/accounts.ts`

**Interfaces:**
- Consumes: `AccountKind`, `needsOwnerCheck`, `nextSlot`, `switchedNoticeText` (Task 1); `createDestinyOneClient` from `@destiny/shared`; `config` from `@/lib/config`.
- Produces (exact):
  - `Account` gains `kind: AccountKind` and `lastUsedAt: number` (epoch ms).
  - `export function apiFor(slot: string): ReturnType<typeof createDestinyOneClient>` — calls as that account without switching.
  - `export function nextAccountSlot(): string | null` — target for a double press.
  - `export type SwitchNotice = { id: number; text: string; avatarUrl: string | null; name: string }`.
  - `export function switchNotice(): SwitchNotice | null` and it is covered by `subscribe`.
  - `export function clearSwitchNotice(): void`.
  - `export async function confirmOwner(name: string, slot?: string): Promise<boolean>` — now skips the prompt inside the grace window.
  - `recordAccount(slot, account)` accepts `Omit<Account, "slot" | "lastUsedAt" | "kind"> & { kind?: AccountKind }` (so callers pass `isAdult: me.isAdult`) and keeps an existing kind when not given. Every existing `recordAccount` call in `session.tsx` gains `isAdult: me.isAdult` / `isAdult: next.isAdult`.

- [ ] **Step 1: Extend `Account` and load old data safely**

Change the interface and add defaults so accounts saved by PR #35 (no `kind`/`lastUsedAt`) still load:

```ts
import { nextSlot, needsOwnerCheck, switchedNoticeText, type AccountKind } from "@destiny/shared";
import { createDestinyOneClient } from "@destiny/shared";
import { config } from "@/lib/config";

export interface Account {
  slot: string;
  userId: string;
  memberId: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  /** A label for the switcher, never a permission. */
  kind: AccountKind;
  /** When this account was last the active one (epoch ms). */
  lastUsedAt: number;
  /** From the server at sign-in. Saved so "send as" can refuse child accounts without a network call. Unknown (old saves) counts as not adult. */
  isAdult: boolean;
}
```
In `loadAccounts`, after `saved = JSON.parse(raw) as Saved;` add:
```ts
        saved = { ...saved, accounts: saved.accounts.map((a) => ({ kind: "member" as const, lastUsedAt: 0, isAdult: false, ...a })) };
```

- [ ] **Step 2: `recordAccount` keeps kind and stamps last used**

Replace its signature/body's construction of `next`:
```ts
export async function recordAccount(slot: string, account: Omit<Account, "slot" | "lastUsedAt" | "kind"> & { kind?: AccountKind }): Promise<void> {
  const duplicate = saved.accounts.find((a) => a.userId === account.userId && a.slot !== slot);
  if (duplicate) await dropSlot(duplicate.slot);

  const existing = saved.accounts.find((a) => a.slot === slot);
  const next: Account = {
    slot,
    ...account,
    kind: account.kind ?? existing?.kind ?? duplicate?.kind ?? "member",
    lastUsedAt: existing?.lastUsedAt ?? Date.now(),
  };
  // ...rest unchanged (list/index/persist/emit)
```

- [ ] **Step 3: `activate` stamps last used and raises the notice**

Replace `activate`:
```ts
export async function activate(slot: string, { announce = false }: { announce?: boolean } = {}): Promise<void> {
  if (slot === saved.active) return;
  const previousSlot = saved.active;
  const previous = client();
  void previous.auth.stopAutoRefresh();
  await previous.removeAllChannels();
  const now = Date.now();
  saved = {
    ...saved,
    active: slot,
    // The account we're leaving was in use until now; the one we're entering is in use from now.
    accounts: saved.accounts.map((a) => (a.slot === previousSlot || a.slot === slot ? { ...a, lastUsedAt: now } : a)),
  };
  if (!saved.accounts.some((a) => a.slot === previousSlot)) clients.delete(previousSlot);
  await persist();
  if (AppState.currentState === "active") void client().auth.startAutoRefresh();
  const entered = saved.accounts.find((a) => a.slot === slot);
  if (announce && entered) notice = { id: ++noticeId, text: switchedNoticeText(entered.displayName), avatarUrl: entered.avatarUrl, name: entered.displayName };
  emit();
}
```
and near the other module state:
```ts
export interface SwitchNotice { id: number; text: string; avatarUrl: string | null; name: string }
let notice: SwitchNotice | null = null;
let noticeId = 0;
export function switchNotice(): SwitchNotice | null { return notice; }
export function clearSwitchNotice() { if (notice) { notice = null; emit(); } }
```

- [ ] **Step 4: `apiFor` and `nextAccountSlot`**

```ts
const slotApis = new Map<string, ReturnType<typeof createDestinyOneClient>>();

/** The API as another signed-in account, without switching to it (used to send as them). */
export function apiFor(slot: string) {
  let api = slotApis.get(slot);
  if (!api) {
    api = createDestinyOneClient({
      baseUrl: config.apiBaseUrl,
      // getSession() refreshes an expired token on the way out, even when this slot isn't active.
      getAccessToken: async () => (await clientFor(slot).auth.getSession()).data.session?.access_token ?? null,
    });
    slotApis.set(slot, api);
  }
  return api;
}

/** Where a double press on Profile goes: the most recently used other account. */
export function nextAccountSlot(): string | null {
  return nextSlot(saved.accounts, saved.active);
}
```
In `dropSlot` add `slotApis.delete(slot);`.

- [ ] **Step 5: owner check with grace**

```ts
export async function confirmOwner(name: string, slot?: string): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    const lastUsedAt = slot ? saved.accounts.find((a) => a.slot === slot)?.lastUsedAt : undefined;
    if (!needsOwnerCheck({ enrolled: level !== LocalAuthentication.SecurityLevel.NONE, lastUsedAt, now: Date.now() })) return true;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: `Switch to ${name}`, disableDeviceFallback: false });
    return result.success;
  } catch {
    return true;
  }
}
```
Update the existing call in `accounts.tsx` to `confirmOwner(account.displayName, account.slot)`.

- [ ] **Step 6: Typecheck**

Run: `cd apps/destiny-one && npm run typecheck`
Expected: PASS (fix any `Account` literal that now needs `kind`/`lastUsedAt`, e.g. in `session.tsx`'s `recordAccount` calls, which need no change because those fields are optional in `recordAccount`'s parameter).

- [ ] **Step 7: Commit**

```bash
git add apps/destiny-one/src
git commit -m "Destiny One: account kind, last used, per-account API and switch notice

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Add account sheet (child / admin) with checks

**Files:**
- Create: `apps/destiny-one/src/components/AddAccountSheet.tsx`
- Modify: `apps/destiny-one/src/state/session.tsx` (`finishAdding`), `apps/destiny-one/src/app/accounts.tsx` (`add`), `apps/destiny-one/src/app/(tabs)/profile.tsx`
- Modify: `apps/destiny-one/src/lib/accounts.ts` (remember the chosen kind for the pending slot)

**Interfaces:**
- Consumes: `checkAddedAccount`, `AccountKind` (Task 1); `D1Me.isStaff` (Task 2); `accounts.beginAdd`, `accounts.finishAdd`.
- Produces: `accounts.beginAdd(kind: AccountKind)`, `accounts.pendingKind(): AccountKind`; `finishAdding(me)` returns `Promise<{ ok: true } | { ok: false; message: string }>`; `AddAccountSheet` component `({ onClose }: { onClose: () => void })`.

- [ ] **Step 1: Remember the kind while adding (accounts.ts)**

```ts
let pendingKindValue: AccountKind = "member";
export async function beginAdd(kind: AccountKind = "member"): Promise<void> {
  await cancelAdd();
  pending = Crypto.randomUUID();
  pendingKindValue = kind;
}
export function pendingKind(): AccountKind { return pendingKindValue; }
```

- [ ] **Step 2: Check the account in `finishAdding` (session.tsx)**

Change `finishAdding`'s return type in `SessionValue` to `Promise<{ ok: true } | { ok: false; message: string }>` and its body:
```ts
  const finishAdding = useCallback(
    async (next: D1Me): Promise<{ ok: true } | { ok: false; message: string }> => {
      const { data } = await accounts.signInClient().auth.getSession();
      const user = data.session?.user;
      const kind = accounts.pendingKind();
      const slot = accounts.finishAdd();
      if (!slot || !user) return { ok: true };
      const check = checkAddedAccount(kind, next);
      if (!check.ok) {
        // Wrong kind of account: forget the new sign-in, leave the current account exactly as it was.
        await accounts.removeAccount(slot, { signOut: true });
        return check;
      }
      if (next.id === meRef.current?.id) {
        await accounts.removeAccount(slot, { signOut: false });
        return { ok: true };
      }
      busy.current = true;
      try {
        await accounts.recordAccount(slot, { userId: user.id, memberId: next.id, email: user.email ?? null, displayName: next.displayName, avatarUrl: next.avatarUrl, isAdult: next.isAdult, kind });
        await runSwitch(slot, next);
      } finally {
        busy.current = false;
      }
      return { ok: true };
    },
    [runSwitch],
  );
```
Import `checkAddedAccount` from `@destiny/shared`. Note: `removeAccount(slot, { signOut: true })` here ends only the new account's own session, which is what we want for a rejected add.

- [ ] **Step 3: Show the rejection in `code.tsx` and the new `password.tsx` (Task 5)**

In `code.tsx` replace
```ts
if (isAdding()) await finishAdding(me);
else setMe(me);
router.dismissAll();
router.replace(routeFor(me));
```
with
```ts
if (isAdding()) {
  const added = await finishAdding(me);
  if (!added.ok) {
    setError(added.message);
    setCode("");
    return;
  }
} else setMe(me);
router.dismissAll();
router.replace(routeFor(me));
```

- [ ] **Step 4: The sheet**

```tsx
// apps/destiny-one/src/components/AddAccountSheet.tsx
// "Add account" from Profile: add a child's account or an admin account. Both
// are just sign-ins to accounts that already exist; the choice only labels the
// account and lets the server check it is the right kind (session.tsx).

import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountKind } from "@destiny/shared";
import { Card, Separator, SettingsRow } from "@/components/ui";
import { MAX_ACCOUNTS, beginAdd } from "@/lib/accounts";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export function AddAccountSheet({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { accounts, session } = useSession();

  async function add(kind: AccountKind) {
    if (accounts.length >= MAX_ACCOUNTS) {
      Alert.alert("Too many accounts", `You can have up to ${MAX_ACCOUNTS} accounts on this device. Sign out of one to add another.`);
      return;
    }
    // Signed out right now: this is just a normal sign-in.
    if (session) await beginAdd(kind);
    onClose();
    router.push("/email");
  }

  return (
    <View style={{ backgroundColor: t.grouped, paddingTop: 22, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: t.text, paddingHorizontal: 4 }}>Add account</Text>
      <Card>
        <SettingsRow icon="people" label="Add child" onPress={() => void add("child")} />
        <Separator />
        <SettingsRow icon="shield" label="Add admin account" onPress={() => void add("admin")} />
      </Card>
      <Text style={{ fontSize: 13, lineHeight: 18, color: t.subtle, paddingHorizontal: 4 }}>
        Sign in with the account's own details. Nothing is shared between accounts.
      </Text>
    </View>
  );
}
```
Verify the icon names exist in `src/components/Icon.tsx` (`people` is used by PR #35; if `shield` is absent use an existing one such as `lock`, and keep it consistent with the file's `IconName` union).

- [ ] **Step 5: Wire it**

In `accounts.tsx` remove the inline `add()` and render `<AddAccountSheet onClose={() => router.back()} />` beneath the accounts list in place of the old "Add another account" row's handler (the row now toggles it: keep a `const [adding, setAdding] = useState(false)` and show `<AddAccountSheet>` inline when true). In `profile.tsx` directly under the name `Card` add:
```tsx
<Card>
  <SettingsRow icon="people" label="Add account" onPress={() => router.push("/add-account")} />
</Card>
```
and create route `apps/destiny-one/src/app/add-account.tsx`:
```tsx
import { router } from "expo-router";
import { AddAccountSheet } from "@/components/AddAccountSheet";
export default function AddAccount() {
  return <AddAccountSheet onClose={() => router.back()} />;
}
```
Register it in `src/app/_layout.tsx` as `presentation: "formSheet"` the same way `accounts` is registered (copy that `Stack.Screen` entry and change the name).

- [ ] **Step 6: Typecheck, then manual check**

Run: `cd apps/destiny-one && npm run typecheck && npm run lint`
Manual (simulator, see Task 8): sign in as the test login, Profile, Add account, Add child, sign in with an adult account: expect "That account isn't a child account." and the original account still active.

- [ ] **Step 7: Commit**

```bash
git add apps/destiny-one/src
git commit -m "Destiny One: Add account under Profile, with child and admin checks

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Passwords

**Files:**
- Modify: `apps/destiny-one/src/lib/auth.ts`, `apps/destiny-one/src/app/email.tsx`
- Create: `apps/destiny-one/src/app/password.tsx`, `apps/destiny-one/src/app/set-password.tsx`
- Modify: `apps/destiny-one/src/app/(tabs)/profile.tsx`, `apps/destiny-one/src/app/_layout.tsx` (register the two routes)

**Interfaces:**
- Consumes: `SIGN_IN_FAILED`, `validateNewPassword` (Task 1); `signInClient`, `signInApi` (existing); `finishAdding` result (Task 4).
- Produces: `signInWithPassword(email: string, password: string): Promise<D1Me>` (throws `Error(SIGN_IN_FAILED)` for any auth failure); `setPassword(password: string): Promise<void>`.

- [ ] **Step 1: Auth functions (auth.ts)**

```ts
import { SIGN_IN_FAILED, validateNewPassword } from "@destiny/shared";
import { client, signInClient } from "@/lib/accounts";
import { signInApi } from "@/lib/api";

/**
 * Password sign-in. Every failure (no such email, wrong password, an account
 * that can't sign in) says the same thing, so the app never reveals who is a member.
 */
export async function signInWithPassword(email: string, password: string): Promise<D1Me> {
  const { error } = await signInClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(SIGN_IN_FAILED);
  return signInApi.link();
}

/** Set or change the signed-in account's password. */
export async function setPassword(password: string): Promise<void> {
  const { data } = await client().auth.getSession();
  const problem = validateNewPassword(password, data.session?.user.email ?? null);
  if (problem) throw new Error(problem);
  const { error } = await client().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
```
(Import names must match what `auth.ts` already imports after Task 0; do not duplicate imports.)

- [ ] **Step 2: Email screen offers both ways**

In `email.tsx`, after the validity check, replace the single "Send code" primary button footer with two actions: `PrimaryButton label="Use password"` pushing `/password` with `{ email }`, and `TextButton label="Email me a code instead"` calling the existing `send()`. Keep the Lead text: "Use the email the church office has for you." Validation, `requestEmailCode` and the rate-limit message stay as they are for the code path. Footer:
```tsx
footer={
  <View style={{ gap: 6 }}>
    <PrimaryButton label="Use password" onPress={usePassword} busy={false} disabled={!email.trim()} />
    <TextButton label="Email me a code instead" onPress={send} />
  </View>
}
```
with
```ts
function usePassword() {
  const value = email.trim();
  if (!EMAIL.test(value)) return setError("That doesn't look like an email address.");
  router.push({ pathname: "/password", params: { email: value } });
}
```
Import `TextButton` from `@/components/ui` (already exported, used in `code.tsx`).

- [ ] **Step 3: Password sign-in screen**

```tsx
// apps/destiny-one/src/app/password.tsx
// Password sign-in. Same finish as the emailed code (code.tsx): in "Add
// account" mode the new account is checked and becomes active; otherwise it
// is the only sign-in on the device.

import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Field, FormError, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { isAdding } from "@/lib/accounts";
import { requestEmailCode, signInWithPassword } from "@/lib/auth";
import { routeFor, useSession } from "@/state/session";

export default function Password() {
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const { setMe, finishAdding } = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const me = await signInWithPassword(email, password);
      if (isAdding()) {
        const added = await finishAdding(me);
        if (!added.ok) {
          setError(added.message);
          return;
        }
      } else setMe(me);
      router.dismissAll();
      router.replace(routeFor(me));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That email or password isn't right.");
    } finally {
      setBusy(false);
    }
  }

  async function emailCode() {
    try {
      await requestEmailCode(email);
    } catch {
      // Same as the email screen: a failed send is reported on the code screen's resend.
    }
    router.replace({ pathname: "/code", params: { email } });
  }

  return (
    <AuthScreen back footer={<PrimaryButton label="Sign in" onPress={signIn} busy={busy} disabled={!password} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Your password</LargeTitle>
        <Lead>{email}</Lead>
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <Field
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          placeholder="Password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={signIn}
          autoFocus
          inputStyle={{ minHeight: 56 }}
        />
        <FormError message={error} />
        <TextButton label="Forgot it? Email me a code" onPress={emailCode} style={{ alignSelf: "flex-start" }} />
      </View>
    </AuthScreen>
  );
}
```
Check `Field` in `components/ui.tsx` forwards `secureTextEntry` (it forwards TextInput props in `email.tsx`, e.g. `keyboardType`); if not, add it to its prop spread.

- [ ] **Step 4: Set/change password screen and Profile row**

```tsx
// apps/destiny-one/src/app/set-password.tsx
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Field, FormError, LargeTitle, Lead, PrimaryButton } from "@/components/ui";
import { setPassword } from "@/lib/auth";
import { errorMessage } from "@/state/session";
import { haptic } from "@/lib/haptics";

export default function SetPassword() {
  const [password, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setPassword(password);
      haptic.success();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen back footer={<PrimaryButton label="Save password" onPress={save} busy={busy} disabled={!password} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Password</LargeTitle>
        <Lead>Use at least 10 characters. You can still sign in with an emailed code.</Lead>
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <Field
          value={password}
          onChangeText={(v) => {
            setValue(v);
            setError(null);
          }}
          placeholder="New password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          autoFocus
          inputStyle={{ minHeight: 56 }}
        />
        <FormError message={error} />
      </View>
    </AuthScreen>
  );
}
```
In `profile.tsx`, in the account card group (next to the notifications row) add `<SettingsRow icon="lock" label="Password" onPress={() => router.push("/set-password")} />` (use an existing icon from `Icon.tsx`). Register `password` and `set-password` in `_layout.tsx` beside `email`/`code` (copy their `Stack.Screen` options).

- [ ] **Step 5: Turn on the Supabase password rules (project setting)**

In the Supabase dashboard for the Destiny project: Authentication, Sign In / Providers, Email: password minimum length 10 and enable leaked password protection (HaveIBeenPwned). Record that this was done in Task 8's docs. (If the tier doesn't offer leaked-password protection, note that instead.)

- [ ] **Step 6: Typecheck and manual check**

Run: `cd apps/destiny-one && npm run typecheck && npm run lint`
Manual: set a password for the test login from Profile; sign out; email, "Use password", correct password signs in; wrong password and unknown email both show exactly "That email or password isn't right."

- [ ] **Step 7: Commit**

```bash
git add apps/destiny-one/src
git commit -m "Destiny One: password sign-in and set/change password

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Double-press Profile to switch, with the banner

**Files:**
- Create: `apps/destiny-one/src/components/SwitchBanner.tsx`
- Modify: `apps/destiny-one/src/app/(tabs)/_layout.tsx`, `apps/destiny-one/src/state/session.tsx`, `apps/destiny-one/src/app/accounts.tsx`, `apps/destiny-one/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `isDoublePress` (Task 1); `accounts.nextAccountSlot`, `accounts.switchNotice`, `accounts.clearSwitchNotice`, `accounts.confirmOwner(name, slot)`, `accounts.activate(slot, { announce })` (Task 3); `haptic.selection` (existing).
- Produces: `SessionValue.switchTo(slot: string, opts?: { announce?: boolean })`; `<SwitchBanner />` mounted once.

- [ ] **Step 1: Let `switchTo` announce**

In `session.tsx` change `runSwitch(slot, knownMe?)` to `runSwitch(slot, knownMe?, announce = false)` and its `await accounts.activate(slot)` to `await accounts.activate(slot, { announce })`. Change `switchTo` to
```ts
  const switchTo = useCallback(
    async (slot: string, opts?: { announce?: boolean }) => {
      if (slot === accounts.activeSlot() || busy.current) return;
      busy.current = true;
      try {
        await runSwitch(slot, undefined, opts?.announce ?? false);
      } finally {
        busy.current = false;
      }
    },
    [runSwitch],
  );
```
and its type in `SessionValue` to `(slot: string, opts?: { announce?: boolean }) => Promise<void>`. In `accounts.tsx` switching from the list also announces: `await switchTo(account.slot, { announce: true })`. `finishAdding`'s switch also announces: `runSwitch(slot, next, true)`.

- [ ] **Step 2: The banner**

```tsx
// apps/destiny-one/src/components/SwitchBanner.tsx
// The small notice that slides down after switching account: "Switched to X
// profile" with their picture. Mounted once in the root layout; driven by the
// notice accounts.activate raises. Reduce Motion fades instead of sliding.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AccessibilityInfo, Animated, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui";
import { clearSwitchNotice, subscribe, switchNotice, type SwitchNotice } from "@/lib/accounts";
import { useTheme } from "@/theme/tokens";

const SHOW_MS = 2500;

export function SwitchBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const notice = useSyncExternalStore(subscribe, switchNotice);
  const [shown, setShown] = useState<SwitchNotice | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  useEffect(() => {
    if (!notice) return;
    setShown(notice);
    progress.setValue(0);
    AccessibilityInfo.announceForAccessibility(notice.text);
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.8 }).start();
    const id = setTimeout(() => {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setShown(null);
        clearSwitchNotice();
      });
    }, SHOW_MS);
    return () => clearTimeout(id);
  }, [notice, progress]);

  if (!shown) return null;

  const translateY = reduce ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] });
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, alignItems: "center", opacity: progress, transform: [{ translateY }] }}
    >
      <Pressable
        onPress={() => clearSwitchNotice()}
        accessibilityRole="alert"
        style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: 999, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.separator, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
      >
        <Avatar name={shown.name} uri={shown.avatarUrl} size={30} />
        <Text style={{ fontSize: 15, fontWeight: "600", color: t.text }}>{shown.text}</Text>
      </Pressable>
    </Animated.View>
  );
}
```
Check `t.card` and `t.separator` exist in `theme/tokens.ts` (`useTheme()` fields); use the equivalents the file has (for example `t.field` / `t.line`) if names differ.

- [ ] **Step 3: Mount it**

In `src/app/_layout.tsx`, render `<SwitchBanner />` once after the `<Stack>` inside `SessionProvider` (siblings, so it overlays every screen).

- [ ] **Step 4: Double press on the Profile tab**

In `(tabs)/_layout.tsx`, add to the `TabBar` component:
```tsx
const lastProfilePress = useRef<number | null>(null);
const { switchTo, accounts } = useSession();

async function quickSwitch() {
  const slot = accountsLib.nextAccountSlot();
  if (!slot) return;
  const target = accounts.find((a) => a.slot === slot);
  if (!target) return;
  if (!(await accountsLib.confirmOwner(target.displayName, slot))) return;
  haptic.selection();
  await switchTo(slot, { announce: true });
}
```
and in the `TabButton` `onPress` for the profile route (right where it currently emits `tabPress`/navigates):
```tsx
onPress={() => {
  if (route.name === "profile") {
    const now = Date.now();
    if (isDoublePress(lastProfilePress.current, now)) {
      lastProfilePress.current = null;
      void quickSwitch();
      return;
    }
    lastProfilePress.current = now;
  }
  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
}}
```
Imports: `import * as accountsLib from "@/lib/accounts";`, `import { isDoublePress } from "@destiny/shared";`, `import { haptic } from "@/lib/haptics";`, `import { useSession } from "@/state/session";`. Update the tab hint to "Double press to switch account, hold for all accounts". Behaviour: a single press still navigates to Profile immediately; a rejected saved session is handled by the existing `runSwitch` (`removeAccount` when its session is gone), and in that case no banner is shown and Profile stays as it was.

- [ ] **Step 5: Typecheck, then manual check on the simulator**

Run: `cd apps/destiny-one && npm run typecheck && npm run lint`
Manual: with two accounts saved, double-press Profile: haptic (device only), banner "Switched to X profile" with picture slides down and goes after 2.5 s; double-press again toggles back. With one account: nothing happens.

- [ ] **Step 6: Commit**

```bash
git add apps/destiny-one/src
git commit -m "Destiny One: double-press Profile to switch account, with a banner

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Hold Send to send as another account

**Files:**
- Create: `apps/destiny-one/src/components/SendAsMenu.tsx`
- Modify: `apps/destiny-one/src/components/Composer.tsx`, `apps/destiny-one/src/lib/useConversation.ts`, and the group conversation screen (`apps/destiny-one/src/app/group/[id]/index.tsx`, where `<Composer` is rendered)

**Interfaces:**
- Consumes: `sendAsCandidates`, `canSendAs` (Task 1); `accounts.apiFor(slot)`, `accounts.accounts()`, `accounts.activeSlot()` (Task 3); `haptic.press/selection/sent/error`.
- Produces: `Composer` prop `onSendAs?: (text: string) => void` (called on a 350 ms hold when there is text); `useConversation().sendAs(slot: string, input: { body: string; replyTo?: number }): Promise<void>`; `<SendAsMenu options onPick onClose />`.

- [ ] **Step 1: `sendAs` in `useConversation.ts`**

Add next to `send`:
```ts
  /**
   * Sends as another signed-in account (holding Send). The message is posted
   * with THAT account's own token, so the server sees an ordinary send by that
   * member: membership, freezes and reports all apply to them. The active
   * account isn't switched and shows no optimistic bubble; the message arrives
   * through Realtime, and a reload makes sure it's there.
   */
  const sendAs = useCallback(
    async (slot: string, input: { body: string; replyTo?: number }) => {
      await accounts.apiFor(slot).send(groupId, input);
      void reload();
    },
    [groupId, reload],
  );
```
Add `import * as accounts from "@/lib/accounts";` and return `sendAs` from the hook alongside `send`.

- [ ] **Step 2: The menu**

```tsx
// apps/destiny-one/src/components/SendAsMenu.tsx
// Shown above the Send button after holding it: pick which of your other
// signed-in accounts sends this message.

import { Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/ui";
import type { Account } from "@/lib/accounts";
import { useTheme } from "@/theme/tokens";

export function SendAsMenu({ options, checking, onPick, onClose }: { options: Account[]; checking: boolean; onPick: (a: Account) => void; onClose: () => void }) {
  const t = useTheme();
  return (
    <>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{ position: "absolute", top: -2000, bottom: -2000, left: -2000, right: -2000 }} />
      <View style={{ position: "absolute", right: 0, bottom: 44, minWidth: 230, borderRadius: 16, backgroundColor: t.card, borderWidth: 0.5, borderColor: t.separator, paddingVertical: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: t.subtle, paddingHorizontal: 14, paddingVertical: 6 }}>SEND AS</Text>
        {options.map((a) => (
          <Pressable key={a.slot} onPress={() => onPick(a)} accessibilityRole="button" accessibilityLabel={`Send as ${a.displayName}`} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 14, opacity: pressed ? 0.6 : 1 })}>
            <Avatar name={a.displayName} uri={a.avatarUrl} size={28} />
            <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{a.displayName}</Text>
          </Pressable>
        ))}
        {options.length === 0 ? (
          <Text style={{ fontSize: 15, color: t.subtle, paddingHorizontal: 14, paddingVertical: 8 }}>{checking ? "Checking your accounts" : "None of your other accounts are in this chat."}</Text>
        ) : null}
      </View>
    </>
  );
}
```
(Same token-name check as Task 6 for `t.card`/`t.separator`.)

- [ ] **Step 3: Composer hold gesture**

In `Composer.tsx` add prop `onSendAs?: (text: string) => void` to `Props`, and on the existing Send `Pressable` (`onPress={send}`) add:
```tsx
onLongPress={() => {
  const text = draft.trim();
  if (!text || !onSendAs) return;
  haptic.press();
  onSendAs(text);
}}
delayLongPress={350}
```
`send()` must not also fire after a long press: React Native's `Pressable` suppresses `onPress` when `onLongPress` fired, so no change is needed. Import `haptic` from `@/lib/haptics` if the file doesn't already (the uncommitted UI-polish work on `feature/destiny-one-ui-polish` also touches this file; if that branch has merged to `main` by then, the merge in Task 0/at rebase keeps its version and this step only adds the two props).

- [ ] **Step 4: Conversation screen wiring**

In `apps/destiny-one/src/app/group/[id]/index.tsx`, where `<Composer ... onSend={...}>` is rendered:
```tsx
const [sendAsText, setSendAsText] = useState<string | null>(null);
const [options, setOptions] = useState<Account[]>([]);
const [checking, setChecking] = useState(false);

async function openSendAs(text: string) {
  // Never from a child account, and never as one (owner's rule, enforced again by sendAsCandidates).
  const active = accountsLib.accounts().find((a) => a.slot === accountsLib.activeSlot());
  if (!canSendAs(active)) return;
  setSendAsText(text);
  setOptions([]);
  setChecking(true);
  const others = accountsLib.accounts().filter((a) => a.slot !== accountsLib.activeSlot());
  // Which of my other accounts are in this group? Each answers as itself; the server has the final say when sending.
  const memberSlots = new Set<string>();
  await Promise.all(
    others.map(async (a) => {
      try {
        const list = await accountsLib.apiFor(a.slot).communities();
        if (list.some((c) => c.groups.some((g) => g.id === groupId))) memberSlots.add(a.slot);
      } catch {
        // Expired session or offline: that account isn't offered.
      }
    }),
  );
  setOptions(sendAsCandidates(others, accountsLib.activeSlot(), memberSlots));
  setChecking(false);
}

async function pick(a: Account) {
  const text = sendAsText;
  setSendAsText(null);
  if (!text) return;
  haptic.selection();
  try {
    await conversation.sendAs(a.slot, { body: text });
    setDraftCleared(); // clear the composer's draft, same as after a normal send
    haptic.sent();
  } catch (err) {
    haptic.error();
    Alert.alert(`Couldn't send as ${a.displayName}`, errorMessage(err));
  }
}
```
Render `<Composer onSendAs={openSendAs} ... />` and, wrapped in a `View style={{ position: "relative" }}` around the composer, `{sendAsText !== null && <SendAsMenu options={options} checking={checking} onPick={pick} onClose={() => setSendAsText(null)} />}`. Name the existing variables to match the screen (`conversation` is the `useConversation(groupId)` result; `groupId` the route param). For clearing the draft, add `onSendAs` handling inside `Composer` itself: expose a `ref` method or pass a `clearDraftSignal` prop; simplest is to have `Composer` call `onSendAs(text)` and the screen returns a boolean promise: change the prop to `onSendAs?: (text: string) => void` plus `Composer` keeps the draft until the screen calls the ref's `clear()`. Use the existing `forwardRef<TextInput>`: `ref.current?.clear()` clears the input; Composer's `draft` state must also reset, so add an `onChangeText` reset by calling `(ref as RefObject<TextInput>).current?.clear()` which fires `onChangeText("")` on iOS and Android.

- [ ] **Step 5: Typecheck and manual check**

Run: `cd apps/destiny-one && npm run typecheck && npm run lint`
Manual (also confirm holding Send from a child account does nothing; needs two accounts that share a group; sign both into the same test group or use the test login plus a second seeded member): type a message, hold Send: haptic, menu lists the other account; choose it: message appears from that account's name, active account unchanged. With a second account not in the group: hold does nothing but shows "None of your other accounts are in this chat.".

- [ ] **Step 6: Commit**

```bash
git add apps/destiny-one/src
git commit -m "Destiny One: hold Send to send as another signed-in account

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Documentation, checks, and the pull request

**Files:**
- Modify: `REPOSITORY_DOCUMENTATION.md` (Destiny One section and API section), `apps/destiny-one/README.md`
- Modify: `apps/destiny-one/todo.md` if it lists passwords/switching

- [ ] **Step 1: Docs**

In `REPOSITORY_DOCUMENTATION.md` (Destiny One area, and where PR #35 documented the account switcher) document: `accountRules.ts` and what each function decides; `D1Me.isStaff` (in the API `me`/`auth/link` description); the components `SwitchBanner`, `AddAccountSheet`, `SendAsMenu`; screens `password`, `set-password`, `add-account`; the interaction rules (double press 300 ms, hold Send 350 ms, grace 60 s); the Supabase password settings from Task 5 Step 5; that passkeys are phase 2 and blocked on the relying-party domain decision.

- [ ] **Step 2: Full checks**

```bash
cd "/Users/kaimathema/Downloads/Projects/Square Media Group/destinychurch/.claude/worktrees/accounts-auth"
npx tsc --noEmit
npx playwright test --project=unit
cd apps/destiny-one && npm run typecheck && npm run lint && npx expo-doctor
```
Expected: all PASS (React Compiler lint findings stay warnings).

- [ ] **Step 3: Simulator pass**

Use the iOS simulator tools (build a dev-client if none exists; the repo's app is Expo dev-client based). Sign in with the test login from `CLAUDE.local.md`, set a password, add a second account, exercise: Add child rejection for an adult, double-press switch and banner, hold-Send menu. Capture screenshots of the banner and the menu.

- [ ] **Step 4: Commit, push, PR**

```bash
git add -A && git commit -m "Destiny One: document accounts, passwords, quick switch and send-as

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push
gh pr create --base main --title "Destiny One: add account, passwords, quick switch, send-as" --body "$(cat <<'EOF'
## Summary
- Profile: Add account (child / admin account), checked server-side by age and staff access
- Password sign-in and Set password, alongside the emailed code
- Double-press Profile to switch, with a "Switched to X profile" banner
- Hold Send to send as another signed-in account (haptics)
- Builds on the slot model from #35 (this branch includes it)

Spec and plan: docs/superpowers/specs and docs/superpowers/plans. Passkeys are phase 2, pending the relying-party domain decision.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Then call the ccd_pr tools `get_status` and `bind_pr` if needed, read CI, and offer Auto-fix. Do not enable auto-merge.
