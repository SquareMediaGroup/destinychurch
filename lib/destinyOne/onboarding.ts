// Destiny One — where a signed-in person stands, as a pure function so the
// app's gating, the API's errors and the tests all agree.
//
// Verification is done by Destiny's own staff (invite or approval), not by
// ChurchSuite — see supabase/migrations/20260927_01_destiny_one_admin.sql.

import type { D1MemberStatus } from "@destiny/shared";

export type OnboardingState =
  /** Verified and allowed in. */
  | "active"
  /** Signed in, no invite: needs to fill in the access request. */
  | "request_needed"
  /** Request sent, waiting for a Destiny One Admin. */
  | "request_submitted"
  /** No invite and requests are switched off. */
  | "invite_only"
  /** Suspended (or a declined request). */
  | "suspended";

export function onboardingState(
  member: { status: D1MemberStatus; request_submitted_at: string | null } | null,
  settings: { allowAccessRequests: boolean },
): OnboardingState {
  if (member?.status === "active") return "active";
  if (member?.status === "suspended" || member?.status === "deleted") return "suspended";
  if (member?.request_submitted_at) return "request_submitted";
  return settings.allowAccessRequests ? "request_needed" : "invite_only";
}

export const ONBOARDING_MESSAGES: Record<Exclude<OnboardingState, "active">, string> = {
  request_needed: "Tell us who you are so the church team can let you in.",
  request_submitted: "Thanks — the church team will review your request soon.",
  invite_only: "Destiny One is invite-only at the moment. Ask your team leader or the church office for an invite.",
  suspended: "This account is not currently able to use Destiny One. Please speak to the church office.",
};

/**
 * The adult_on a staff decision produces (approval, invite, or an age fix).
 *
 *   adult,   no DOB → today ("known to be an adult from today")
 *   adult,   DOB    → their 18th birthday, which must already have passed
 *   under-18, DOB   → their 18th birthday, which must be in the future
 *   under-18, no DOB → null (a minor until someone changes it)
 *
 * The choice and the date must agree; a mismatch is an error for the admin to
 * fix rather than a silent guess either way.
 */
export function adultOnForDecision(
  input: { adult: boolean; dateOfBirth?: string | null },
  today: string,
  adultOnFromDob: (dob: string) => string | null,
): { ok: true; adultOn: string | null } | { ok: false; error: string } {
  if (!input.dateOfBirth) return { ok: true, adultOn: input.adult ? today : null };
  const adultOn = adultOnFromDob(input.dateOfBirth);
  if (!adultOn) return { ok: false, error: "That date of birth isn't a real date." };
  if (input.adult && adultOn > today) {
    return { ok: false, error: "That date of birth makes them under 18. Choose under-18 instead." };
  }
  if (!input.adult && adultOn <= today) {
    return { ok: false, error: "That date of birth makes them 18 or over. Choose adult instead." };
  }
  return { ok: true, adultOn };
}
