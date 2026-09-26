// Destiny One — matching an app account to a ChurchSuite person.
//
// Accounts are provisioned against ChurchSuite, not self-declared
// (docs/mobile-app-scope.md §3). Anyone can sign in with an email they
// control; nobody can *chat* until that sign-in has been tied to exactly one
// active ChurchSuite record, which is where their real name and adult/minor
// status come from.
//
// Every uncertain case lands on `pending`, which can read nothing and post
// nothing, and a safeguarding admin links it by hand
// (/api/admin/destiny-one/members/[id]):
//   • no ChurchSuite record with that exact email
//   • more than one (a shared family address)
//   • the record is already linked to a different account
//   • ChurchSuite is down on first sign-in
//
// ChurchSuite being down never *downgrades* an existing member: an outage is
// "no change", not "this person has gone" (§5.3).

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { pickByEmail, type CsPerson } from "@/lib/destinyOne/churchsuite";
import {
  ChurchSuiteUnavailable,
  churchSuiteConfigured,
  findPeopleByEmail,
  getChild,
  getContact,
} from "@/lib/destinyOne/churchsuite.server";
import { MEMBER_COLUMNS, loadMemberByAuthUser, type AuthUser, type MemberRow } from "@/lib/destinyOne/auth.server";
import { OneError } from "@/lib/destinyOne/http";
import { recordNotification } from "@/lib/notify.server";

const PENDING_NAME = "Pending verification";

export interface SignInHint {
  /** From Sign in with ChurchSuite: the ChurchSuite user and their linked contact. */
  churchsuiteUserId: number;
  contactId: number | null;
}

type Resolved =
  | { kind: "person"; person: CsPerson }
  | { kind: "gone" } // looked up by id and ChurchSuite says it no longer exists
  | { kind: "unmatched"; why: string }
  | { kind: "unavailable" };

async function resolve(existing: MemberRow | null, email: string | null, hint?: SignInHint): Promise<Resolved> {
  if (!churchSuiteConfigured()) return { kind: "unavailable" };
  try {
    if (existing?.churchsuite_contact_id) {
      const p = await getContact(existing.churchsuite_contact_id);
      return p ? { kind: "person", person: p } : { kind: "gone" };
    }
    if (existing?.churchsuite_child_id) {
      const p = await getChild(existing.churchsuite_child_id);
      return p ? { kind: "person", person: p } : { kind: "gone" };
    }
    if (hint?.contactId) {
      const p = await getContact(hint.contactId);
      return p ? { kind: "person", person: p } : { kind: "unmatched", why: "ChurchSuite user has no contact" };
    }
    if (!email) return { kind: "unmatched", why: "no email on the account" };

    const pick = pickByEmail(await findPeopleByEmail(email), email);
    if (pick.kind === "match") return { kind: "person", person: pick.person };
    return {
      kind: "unmatched",
      why: pick.kind === "ambiguous" ? `${pick.count} ChurchSuite records share this email` : "no ChurchSuite record",
    };
  } catch (err) {
    if (err instanceof ChurchSuiteUnavailable) {
      console.warn("⚠️ ChurchSuite unavailable during Destiny One identity check:", err.message);
      return { kind: "unavailable" };
    }
    throw err;
  }
}

function fieldsFor(person: CsPerson): Partial<MemberRow> & { last_synced_at: string } {
  return {
    display_name: person.displayName,
    adult_on: person.adultOn,
    churchsuite_contact_id: person.kind === "contact" ? person.id : null,
    churchsuite_child_id: person.kind === "child" ? person.id : null,
    status: person.status === "active" ? "active" : "pending",
    last_synced_at: new Date().toISOString(),
  };
}

async function linkedElsewhere(person: CsPerson, memberId: string | null): Promise<boolean> {
  const column = person.kind === "contact" ? "churchsuite_contact_id" : "churchsuite_child_id";
  let query = createServiceClient().from("d1_members").select("id").eq(column, person.id);
  if (memberId) query = query.neq("id", memberId);
  const { data } = await query.limit(1);
  return (data ?? []).length > 0;
}

async function write(existing: MemberRow | null, authUserId: string, fields: Record<string, unknown>): Promise<MemberRow> {
  const supabase = createServiceClient();
  const result = existing
    ? await supabase.from("d1_members").update(fields).eq("id", existing.id).select(MEMBER_COLUMNS).single()
    : await supabase
        .from("d1_members")
        .insert({ auth_user_id: authUserId, display_name: PENDING_NAME, ...fields })
        .select(MEMBER_COLUMNS)
        .single();

  if (result.error) {
    // A DB rule refused it (e.g. a phone number on the auth user, or a leader
    // role on someone ChurchSuite now says is under 18). Fall back to pending
    // rather than failing sign-in outright.
    console.error("⚠️ Destiny One member write refused:", result.error.message);
    if (!existing) {
      const fallback = await supabase
        .from("d1_members")
        .insert({ auth_user_id: authUserId, display_name: PENDING_NAME, status: "pending" })
        .select(MEMBER_COLUMNS)
        .single();
      if (fallback.error) throw new OneError("unavailable", "Something went wrong. Please try again.");
      await announcePending(fallback.data as MemberRow);
      return fallback.data as MemberRow;
    }
    return existing;
  }
  const row = result.data as MemberRow;
  if (!existing && row.status === "pending") await announcePending(row);
  return row;
}

/**
 * A pending account is told "the church office will be in touch" — this is
 * what makes that true. Once per account (on first creation), not per sign-in.
 */
async function announcePending(row: MemberRow): Promise<void> {
  await recordNotification({
    section: "safeguarding",
    kind: "d1_pending_member",
    entityId: row.id,
    entityLabel: null,
    summary: "A new Destiny One sign-in needs linking to a ChurchSuite record before it can chat",
    href: "/admin/safeguarding",
    roles: ["safeguarding_admin"],
  });
}

/**
 * Called after every sign-in (POST /auth/link, and the ChurchSuite callback).
 * Idempotent: re-running it refreshes the name and adult status.
 */
export async function linkMember(user: AuthUser, hint?: SignInHint): Promise<MemberRow> {
  const existing = await loadMemberByAuthUser(user.id);
  if (existing && (existing.status === "suspended" || existing.status === "deleted")) return existing;

  // The database refuses to activate an account with a phone number on it;
  // don't even look it up.
  if (user.phone) return existing ?? write(null, user.id, { status: "pending" });

  const resolved = await resolve(existing, user.email, hint);

  switch (resolved.kind) {
    case "unavailable":
      return existing ?? write(null, user.id, { status: "pending" });

    case "gone":
      // Removed from ChurchSuite. Back to pending: their groups re-evaluate and
      // freeze if they were one of the two adults, which is the point.
      return write(existing, user.id, { status: "pending", last_synced_at: new Date().toISOString() });

    case "unmatched":
      console.log(`🔎 Destiny One sign-in left pending (${resolved.why})`);
      return existing ?? write(null, user.id, { status: "pending" });

    case "person": {
      if (await linkedElsewhere(resolved.person, existing?.id ?? null)) {
        console.warn("⚠️ ChurchSuite record already linked to another Destiny One account; leaving pending.");
        return existing ?? write(null, user.id, { status: "pending" });
      }
      const fields: Record<string, unknown> = { ...fieldsFor(resolved.person) };
      if (hint) fields.churchsuite_user_id = hint.churchsuiteUserId;
      return write(existing, user.id, fields);
    }
  }
}

/**
 * Nightly refresh of one linked member (the destiny-one-sync cron). Returns
 * what changed, for the log. Never throws on a ChurchSuite outage.
 */
export async function resyncMember(member: MemberRow): Promise<"unchanged" | "updated" | "gone" | "skipped"> {
  if (member.status === "deleted" || member.status === "suspended") return "skipped";
  if (!member.churchsuite_contact_id && !member.churchsuite_child_id) return "skipped";

  const resolved = await resolve(member, null);
  if (resolved.kind === "unavailable" || resolved.kind === "unmatched") return "skipped";

  const supabase = createServiceClient();
  if (resolved.kind === "gone") {
    await supabase
      .from("d1_members")
      .update({ status: "pending", last_synced_at: new Date().toISOString() })
      .eq("id", member.id);
    return "gone";
  }

  const next = fieldsFor(resolved.person);
  const changed =
    next.display_name !== member.display_name ||
    next.adult_on !== member.adult_on ||
    next.status !== member.status;

  const { error } = await supabase.from("d1_members").update(next).eq("id", member.id);
  if (error) {
    console.error(`⚠️ Destiny One resync refused for ${member.id}:`, error.message);
    return "skipped";
  }
  return changed ? "updated" : "unchanged";
}
