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

/** What Supabase Auth says was wrong with a new password (AuthWeakPasswordError.reasons). */
export type PasswordRejectionReason = "length" | "characters" | "pwned" | (string & {});

export interface PasswordRejection {
  /** Found in a known data breach (Supabase's leaked password protection, via Have I Been Pwned). */
  breached: boolean;
  title: string;
  body: string;
}

/**
 * Plain words for a password Supabase Auth refused, shared by the app's
 * Password screen and the website's admin password reset.
 *
 * The breach check never sends the password: Supabase looks up only the first
 * few characters of its SHA-1 hash (Have I Been Pwned's k-anonymity range
 * search), which is what the "checked without being shared" line means.
 * `minLength` is the caller's own minimum, for the too-short message.
 */
export function passwordRejection(reasons: readonly PasswordRejectionReason[], minLength = MIN_PASSWORD_LENGTH): PasswordRejection {
  if (reasons.includes("pwned")) {
    return {
      breached: true,
      title: "This password has been leaked",
      body:
        "It appears in a list of passwords exposed in data breaches on other websites, so it's one of the first that people trying to get into accounts will guess. Please choose a different one, ideally one you don't use anywhere else. Your password was checked without being shared.",
    };
  }
  if (reasons.includes("characters")) {
    return {
      breached: false,
      title: "Add a few different kinds of character",
      body: "Mix letters with numbers or symbols, or use a longer phrase.",
    };
  }
  return {
    breached: false,
    title: "Choose a longer password",
    body: `Use at least ${minLength} characters. A few random words together are long and easy to remember.`,
  };
}

/** Staff access to the admin side, for labelling an added "admin account". */
export function hasStaffAccess(
  row: { destiny_one_admin?: boolean | null; safeguarding_admin?: boolean | null; super_admin?: boolean | null } | null | undefined,
): boolean {
  return Boolean(row?.destiny_one_admin || row?.safeguarding_admin || row?.super_admin);
}
