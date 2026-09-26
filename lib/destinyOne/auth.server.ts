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
  isAdult,
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

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface MemberRow {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  status: D1MemberStatus;
  roles: D1LeaderRole[];
  adult_on: string | null;
  churchsuite_contact_id: number | null;
  churchsuite_child_id: number | null;
  churchsuite_user_id: number | null;
  created_at: string;
}

export const MEMBER_COLUMNS =
  "id, auth_user_id, display_name, status, roles, adult_on, churchsuite_contact_id, churchsuite_child_id, churchsuite_user_id, created_at";

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

  if (!member || member.status === "pending") {
    throw new OneError(
      "not_verified",
      "We haven't been able to match your account to the church's records yet. The church office will be in touch.",
    );
  }
  if (member.status !== "active") {
    throw new OneError("forbidden", "This account is not currently able to use Destiny One.");
  }

  if (opts.requireConsent !== false) {
    const accepted = await loadConsents(member.id);
    if (outstandingConsents(accepted).length > 0) {
      throw new OneError("consent_required", "Please review and accept the latest notices to continue.");
    }
  }

  return { user, member, policy: toPolicy(member) };
}

/** The D1Me payload for a member row (any status). */
export async function toMe(member: MemberRow): Promise<D1Me> {
  const consents = await loadConsents(member.id);
  return {
    id: member.id,
    displayName: member.display_name,
    status: member.status,
    roles: member.roles ?? [],
    isAdult: isAdult(member.adult_on),
    consents,
    outstandingConsents: outstandingConsents(consents),
    verified: Boolean(member.churchsuite_contact_id || member.churchsuite_child_id),
  };
}
