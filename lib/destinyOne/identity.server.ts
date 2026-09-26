// Destiny One — turning a sign-in into a member.
//
// Verification is done by Destiny's own staff, not by ChurchSuite
// (supabase/migrations/20260927_01_destiny_one_admin.sql). After a sign-in:
//
//   1. Already a member            → as they are.
//   2. An open invite for the email → active, with the name / adult status /
//                                     roles / communities the admin set. The
//                                     email one-time code already proved they
//                                     own the address.
//   3. Sign in with ChurchSuite     → OPTIONAL: if ChurchSuite is configured and
//                                     the ChurchSuite user is linked to an
//                                     active contact, verified from that.
//   4. Anyone else                  → pending. They fill in an access request
//                                     (or are told it's invite-only), and a
//                                     Destiny One Admin approves them.
//
// ChurchSuite is never required, and its being down never blocks or
// downgrades anyone.

import "server-only";
import { adultOnFromDateOfBirth, type D1AccessRequest } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { type CsPerson } from "@/lib/destinyOne/churchsuite";
import {
  ChurchSuiteUnavailable,
  churchSuiteConfigured,
  getChild,
  getContact,
} from "@/lib/destinyOne/churchsuite.server";
import { MEMBER_COLUMNS, loadMemberByAuthUser, type AuthUser, type MemberRow } from "@/lib/destinyOne/auth.server";
import { OneError } from "@/lib/destinyOne/http";
import { getSettings } from "@/lib/destinyOne/settings.server";
import { recordNotification } from "@/lib/notify.server";

/** Shown to staff until the person submits their access request. */
const UNNAMED = "New sign-in";

export interface SignInHint {
  /** From Sign in with ChurchSuite: the ChurchSuite user and their linked contact. */
  churchsuiteUserId: number;
  contactId: number | null;
}

async function load(memberId: string): Promise<MemberRow> {
  const { data, error } = await createServiceClient()
    .from("d1_members")
    .select(MEMBER_COLUMNS)
    .eq("id", memberId)
    .single();
  if (error || !data) throw new OneError("unavailable", "Something went wrong. Please try again.");
  return data as MemberRow;
}

async function createPending(authUserId: string): Promise<MemberRow> {
  const { data, error } = await createServiceClient()
    .from("d1_members")
    .insert({ auth_user_id: authUserId, display_name: UNNAMED, status: "pending" })
    .select(MEMBER_COLUMNS)
    .single();
  if (error || !data) {
    // Two sign-ins racing: the other one created it.
    const existing = await loadMemberByAuthUser(authUserId);
    if (existing) return existing;
    throw new OneError("unavailable", "Something went wrong. Please try again.");
  }
  return data as MemberRow;
}

/** An open invite for this email, accepted. Null if there isn't one. */
async function acceptInvite(user: AuthUser): Promise<MemberRow | null> {
  if (!user.email) return null;
  const { data, error } = await createServiceClient().rpc("d1_accept_invite", {
    p_auth_user: user.id,
    p_email: user.email,
  });
  if (error) {
    // e.g. the database refusing an account with a phone number on it.
    console.error("⚠️ Destiny One invite could not be accepted:", error.message);
    return null;
  }
  return data ? load(data as string) : null;
}

/** Optional ChurchSuite verification for staff who used Sign in with ChurchSuite. */
async function verifyFromChurchSuite(existing: MemberRow | null, authUserId: string, hint: SignInHint): Promise<MemberRow | null> {
  if (!churchSuiteConfigured() || !hint.contactId) return null;

  let person: CsPerson | null;
  try {
    person = await getContact(hint.contactId);
  } catch (err) {
    if (err instanceof ChurchSuiteUnavailable) return null;
    throw err;
  }
  if (!person || person.status !== "active") return null;

  const supabase = createServiceClient();
  const { data: clash } = await supabase
    .from("d1_members")
    .select("id")
    .eq("churchsuite_contact_id", person.id)
    .neq("id", existing?.id ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);
  if ((clash ?? []).length) {
    console.warn("⚠️ ChurchSuite contact already linked to another Destiny One account; leaving for staff.");
    return null;
  }

  const fields = {
    display_name: person.displayName,
    adult_on: person.adultOn,
    churchsuite_contact_id: person.id,
    churchsuite_user_id: hint.churchsuiteUserId,
    status: "active",
    verified_at: new Date().toISOString(),
    verification_source: "churchsuite",
    last_synced_at: new Date().toISOString(),
  };
  const result = existing
    ? await supabase.from("d1_members").update(fields).eq("id", existing.id).select(MEMBER_COLUMNS).single()
    : await supabase.from("d1_members").insert({ auth_user_id: authUserId, ...fields }).select(MEMBER_COLUMNS).single();
  if (result.error) {
    console.error("⚠️ Destiny One ChurchSuite verification refused:", result.error.message);
    return null;
  }
  return result.data as MemberRow;
}

/**
 * Called after every sign-in (POST /auth/link, and the ChurchSuite callback).
 * Idempotent.
 */
export async function onboardMember(user: AuthUser, hint?: SignInHint): Promise<MemberRow> {
  const existing = await loadMemberByAuthUser(user.id);
  if (existing && existing.status !== "pending") return existing;

  const invited = await acceptInvite(user);
  if (invited) return invited;

  if (hint && !user.phone) {
    const verified = await verifyFromChurchSuite(existing, user.id, hint);
    if (verified) return verified;
  }

  return existing ?? createPending(user.id);
}

/**
 * The access request form (POST /me/access-request). Records what the person
 * says about themselves for a Destiny One Admin to review. The date of birth
 * is kept only as `declared_adult_on`, which no rule ever reads — only the
 * admin's decision on approval counts.
 */
export async function submitAccessRequest(member: MemberRow, input: D1AccessRequest): Promise<MemberRow> {
  if (member.status !== "pending") {
    throw new OneError("invalid", "This account doesn't need an access request.");
  }
  const settings = await getSettings();
  if (!settings.allowAccessRequests) {
    throw new OneError(
      "forbidden",
      "Destiny One is invite-only at the moment. Ask your team leader or the church office for an invite.",
    );
  }

  const first = !member.request_submitted_at;
  const { data, error } = await createServiceClient()
    .from("d1_members")
    .update({
      display_name: input.name,
      declared_adult_on: adultOnFromDateOfBirth(input.dateOfBirth),
      request_note: input.note?.trim() || null,
      request_submitted_at: new Date().toISOString(),
    })
    .eq("id", member.id)
    .select(MEMBER_COLUMNS)
    .single();
  if (error || !data) throw new OneError("unavailable", "Something went wrong. Please try again.");

  if (first) {
    await recordNotification({
      section: "destiny_one",
      kind: "d1_access_request",
      entityId: member.id,
      entityLabel: input.name,
      summary: `${input.name} asked to join Destiny One`,
      href: "/admin/destiny-one/requests",
      roles: ["destiny_one_admin"],
    });
  }
  return data as MemberRow;
}

/**
 * Nightly refresh (destiny-one-sync cron) — ONLY for members who were verified
 * by ChurchSuite in the first place. Staff-verified members are never touched
 * by ChurchSuite, even if staff linked a record for reference. Never throws on
 * an outage.
 */
export async function resyncMember(member: MemberRow): Promise<"unchanged" | "updated" | "gone" | "skipped"> {
  if (member.verification_source !== "churchsuite" || member.status !== "active") return "skipped";
  if (!churchSuiteConfigured()) return "skipped";
  if (!member.churchsuite_contact_id && !member.churchsuite_child_id) return "skipped";

  let person: CsPerson | null;
  try {
    person = member.churchsuite_contact_id
      ? await getContact(member.churchsuite_contact_id)
      : member.churchsuite_child_id
        ? await getChild(member.churchsuite_child_id)
        : null;
  } catch (err) {
    if (err instanceof ChurchSuiteUnavailable) return "skipped";
    throw err;
  }

  const supabase = createServiceClient();
  if (!person || person.status !== "active") {
    // Gone from ChurchSuite: back to pending for staff to look at. Their
    // groups re-evaluate and pause if they were one of the two adults.
    await supabase
      .from("d1_members")
      .update({ status: "pending", last_synced_at: new Date().toISOString() })
      .eq("id", member.id);
    return "gone";
  }

  const changed = person.displayName !== member.display_name || person.adultOn !== member.adult_on;
  const { error } = await supabase
    .from("d1_members")
    .update({ display_name: person.displayName, adult_on: person.adultOn, last_synced_at: new Date().toISOString() })
    .eq("id", member.id);
  if (error) {
    console.error(`⚠️ Destiny One resync refused for ${member.id}:`, error.message);
    return "skipped";
  }
  return changed ? "updated" : "unchanged";
}
