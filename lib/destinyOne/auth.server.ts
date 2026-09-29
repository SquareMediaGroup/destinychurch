// Destiny One — who is calling.
//
// The app sends its Supabase access token as `Authorization: Bearer …`. There
// are no cookies on these routes (a native app has no cookie jar we'd want to
// rely on), so middleware.ts doesn't see them; every route resolves its caller
// here.
//
// Three gates, applied in order and each one opt-out-able per route:
//   1. authenticated  — a valid Supabase session
//   2. verified       — a d1_members row with status 'active' (linked to a
//                       ChurchSuite record, not suspended)
//   3. consented      — has accepted the current privacy / terms / chat-review
//                       notices (REQUIRED_CONSENTS)

import "server-only";
import {
  hasStaffAccess,
  isAdult,
  nameChangeAllowance,
  outstandingConsents,
  type D1Consent,
  type D1ConsentDocument,
  type D1Me,
  type D1LeaderRole,
  type D1MemberStatus,
  type PolicyMember,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { OneError } from "@/lib/destinyOne/http";
import { ONBOARDING_MESSAGES, onboardingState } from "@/lib/destinyOne/onboarding";
import { getSettings } from "@/lib/destinyOne/settings.server";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface MemberRow {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  first_name: string;
  last_name: string;
  name_edited_at: string | null;
  name_change_log: string[];
  avatar_url: string | null;
  status: D1MemberStatus;
  roles: D1LeaderRole[];
  adult_on: string | null;
  churchsuite_contact_id: number | null;
  churchsuite_child_id: number | null;
  churchsuite_user_id: number | null;
  verified_at: string | null;
  verification_source: "invite" | "admin" | "churchsuite" | null;
  request_submitted_at: string | null;
  created_at: string;
}

export const MEMBER_COLUMNS =
  "id, auth_user_id, display_name, first_name, last_name, name_edited_at, name_change_log, avatar_url, status, roles, adult_on, churchsuite_contact_id, churchsuite_child_id, churchsuite_user_id, verified_at, verification_source, request_submitted_at, created_at";

export interface Caller {
  user: AuthUser;
  member: MemberRow;
  policy: PolicyMember;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

export async function authenticate(request: Request): Promise<AuthUser> {
  const token = bearerToken(request);
  if (!token) throw new OneError("unauthenticated", "Please sign in.");

  const { data, error } = await createServiceClient().auth.getUser(token);
  if (error || !data.user) throw new OneError("unauthenticated", "Your session has expired. Please sign in again.");

  return {
    id: data.user.id,
    email: data.user.email?.toLowerCase() ?? null,
    phone: data.user.phone || null,
  };
}

export function toPolicy(member: MemberRow): PolicyMember {
  return { status: member.status, roles: member.roles ?? [], isAdult: isAdult(member.adult_on) };
}

export async function loadMemberByAuthUser(authUserId: string): Promise<MemberRow | null> {
  const { data, error } = await createServiceClient()
    .from("d1_members")
    .select(MEMBER_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw new OneError("unavailable", "Something went wrong. Please try again.");
  return (data as MemberRow | null) ?? null;
}

export async function loadConsents(memberId: string): Promise<(D1Consent & { acceptedAt: string })[]> {
  const { data } = await createServiceClient()
    .from("d1_consents")
    .select("document, version, accepted_at")
    .eq("member_id", memberId)
    .order("accepted_at", { ascending: true });
  return (data ?? []).map((row) => ({
    document: row.document as D1ConsentDocument,
    version: row.version as string,
    acceptedAt: row.accepted_at as string,
  }));
}

/**
 * The caller as an active, verified, consented member — or a thrown OneError
 * the route turns into 401/403 with a code the app can act on.
 */
export async function requireMember(
  request: Request,
  opts: { requireConsent?: boolean } = {},
): Promise<Caller> {
  const user = await authenticate(request);
  const member = await loadMemberByAuthUser(user.id);

  if (!member || member.status !== "active") {
    const state = onboardingState(member, await getSettings());
    const shown = state === "active" ? "suspended" : state; // unreachable: not active above
    throw new OneError(
      shown === "request_needed" ? "access_request_needed" : shown === "suspended" ? "forbidden" : "not_verified",
      ONBOARDING_MESSAGES[shown],
    );
  }

  if (opts.requireConsent !== false) {
    const accepted = await loadConsents(member.id);
    if (outstandingConsents(accepted).length > 0) {
      throw new OneError("consent_required", "Please review and accept the latest notices to continue.");
    }
  }

  return { user, member, policy: toPolicy(member) };
}

export const AVATAR_BUCKET = "d1-avatars";
/** Profile pictures are private; the app re-fetches `me` on every cold start, well inside this. */
const AVATAR_URL_TTL = 7 * 24 * 60 * 60;

/** A signed link to a profile picture, from its storage path in the private bucket. */
export async function avatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await createServiceClient().storage.from(AVATAR_BUCKET).createSignedUrl(path, AVATAR_URL_TTL);
  return data?.signedUrl ?? null;
}

/** The people this member has blocked, for D1Me and for filtering reads. */
export async function loadBlocked(memberId: string): Promise<{ id: string; displayName: string }[]> {
  const { data } = await createServiceClient()
    .from("d1_blocks")
    .select("blocked:d1_members!d1_blocks_blocked_id_fkey(id, display_name)")
    .eq("blocker_id", memberId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((row) => {
    const b = row.blocked as unknown as { id: string; display_name: string };
    return { id: b.id, displayName: b.display_name };
  });
}

/** The account's admin roles, if it has any (service-only table). Null for no row or no sign-in. */
async function loadStaffRoles(authUserId: string | null) {
  if (!authUserId) return null;
  const { data } = await createServiceClient()
    .from("admin_roles")
    .select("destiny_one_admin, safeguarding_admin, super_admin")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return data;
}

/** The D1Me payload for a member row (any status). */
export async function toMe(member: MemberRow): Promise<D1Me> {
  const [consents, settings, blocked, avatar, staff] = await Promise.all([
    loadConsents(member.id),
    getSettings(),
    loadBlocked(member.id),
    avatarUrl(member.avatar_url),
    loadStaffRoles(member.auth_user_id),
  ]);
  const state = onboardingState(member, settings);
  const allowance = nameChangeAllowance(member.name_change_log);
  return {
    id: member.id,
    displayName: member.display_name,
    firstName: member.first_name,
    lastName: member.last_name,
    nameChangesLeft: allowance.left,
    nextNameChangeAt: allowance.nextAt,
    avatarUrl: avatar,
    blocked,
    status: member.status,
    roles: member.roles ?? [],
    isAdult: isAdult(member.adult_on),
    isStaff: hasStaffAccess(staff),
    consents,
    outstandingConsents: outstandingConsents(consents),
    verified: Boolean(member.verified_at),
    verification: member.verification_source,
    onboarding: state,
    onboardingMessage: state === "active" ? null : ONBOARDING_MESSAGES[state],
  };
}
