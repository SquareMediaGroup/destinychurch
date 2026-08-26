// recordAudit() — the one way anything gets into the audit log.
//
// Called from every mutating handler under /api/admin (plus sign-in and
// sign-out, which happen outside it). tests/unit/audit-coverage.spec.ts fails
// the build if a mutating admin route forgets, because a log with holes in it
// is worse than no log: it teaches people to trust an answer that is missing
// exactly the change they were looking for.
//
// Three rules this file exists to enforce:
//
//   1. **It never throws.** An audit write failing must not fail the thing the
//      admin was actually doing. Errors go to the server log and the request
//      carries on.
//   2. **It never stores a secret.** Everything routes through sanitiseValue()
//      in lib/audit.ts — a temporary password posted to /api/admin/users is
//      recorded as a user being created, not as a password.
//   3. **It costs one insert.** The actor comes from the headers middleware
//      already set, so logging a change doesn't add an auth round trip to
//      every save.

import "server-only";
import { headers, cookies } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { createClient } from "@/utils/supabase/server";
import { ADMIN_ROLES, getRoles } from "@/lib/adminRoles";
import {
  AUDIT_ACTOR_HEADERS,
  REDACTED,
  diffRecords,
  sanitiseValue,
  snapshotRecord,
  type AuditAction,
  type AuditChanges,
  type AuditSection,
} from "@/lib/audit";

export interface AuditActor {
  id: string | null;
  email: string | null;
  roles: string[];
}

export interface AuditInput {
  action: AuditAction;
  section: AuditSection;
  /** The kind of thing, lowercase and singular: "product", "leave request". */
  entity: string;
  entityId?: string | number | null;
  /** The human name of it, captured now — "Faith Hoodie", not a uuid. */
  entityLabel?: string | null;
  /**
   * One plain sentence, past tense, naming the thing:
   * `Added the product “Faith Hoodie” to the store`.
   *
   * Worth writing by hand at every call site: this is the text the search box
   * matches and the only thing the AI sees when it answers "who added X".
   */
  summary: string;
  /** The record before the change (updates and deletes). */
  before?: Record<string, unknown> | null;
  /** The record after the change (creates and updates). */
  after?: Record<string, unknown> | null;
  /** Overrides the before/after diff when a hand-built one reads better. */
  changes?: AuditChanges | null;
  /**
   * Fields whose *values* are replaced with `[redacted]` while still recording
   * that they changed.
   *
   * Used by HR, where the fact that someone edited a leave reason or a staff
   * note is exactly what the log is for, but copying the reason itself into a
   * second, longer-lived table isn't. Same instinct as HR being left out of the
   * ⌘K search — see app/api/admin/search/route.ts.
   */
  redactFields?: string[];
  /** Anything that isn't a field change but is worth keeping. */
  metadata?: Record<string, unknown> | null;
  /**
   * Skips the header/cookie lookup. Used by sign-in, which knows exactly who
   * just authenticated and runs outside the admin middleware.
   */
  actor?: AuditActor;
}

const EMPTY_ACTOR: AuditActor = { id: null, email: null, roles: [] };

/**
 * Who did it.
 *
 * Middleware puts the answer on the request headers for everything under
 * /admin and /api/admin. Sign-in and sign-out run outside that, so there's a
 * cookie fallback that pays for a real Supabase lookup — rare enough not to
 * matter, and better than an unattributed row.
 */
async function resolveActor(explicit?: AuditActor): Promise<AuditActor> {
  if (explicit) return explicit;

  try {
    const h = await headers();
    const id = h.get(AUDIT_ACTOR_HEADERS.id);
    const email = h.get(AUDIT_ACTOR_HEADERS.email);
    if (id) {
      return {
        id,
        email: email || null,
        roles: (h.get(AUDIT_ACTOR_HEADERS.roles) || "")
          .split(",")
          .map((r) => r.trim())
          .filter((r) => ADMIN_ROLES.includes(r as never)),
      };
    }
  } catch {
    // Outside a request scope (a script, a background job) — fall through.
  }

  try {
    const cookieStore = await cookies();
    const {
      data: { user },
    } = await createClient(cookieStore).auth.getUser();
    if (!user) return EMPTY_ACTOR;
    const roles = await getRoles(createServiceClient(), user.id);
    return {
      id: user.id,
      email: user.email ?? null,
      roles: ADMIN_ROLES.filter((role) => roles[role]),
    };
  } catch {
    return EMPTY_ACTOR;
  }
}

/** Request context for the detail view: how the change arrived, and from where. */
async function requestContext() {
  try {
    const h = await headers();
    return {
      method: h.get(AUDIT_ACTOR_HEADERS.method),
      path: h.get(AUDIT_ACTOR_HEADERS.path),
      ip:
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null,
      user_agent: h.get("user-agent"),
    };
  } catch {
    return { method: null, path: null, ip: null, user_agent: null };
  }
}

function buildChanges(input: AuditInput): AuditChanges | null {
  const changes =
    input.changes !== undefined
      ? input.changes
      : input.action === "delete"
        ? snapshotRecord(input.before ?? input.after)
        : input.before
          ? diffRecords(input.before, input.after)
          : snapshotRecord(input.after);

  if (!changes || !input.redactFields?.length) return changes;

  const redacted: AuditChanges = {};
  for (const [field, change] of Object.entries(changes)) {
    redacted[field] = input.redactFields.includes(field)
      ? { from: change.from == null ? null : REDACTED, to: change.to == null ? null : REDACTED }
      : change;
  }
  return redacted;
}

/**
 * Write one entry. Fire-and-forget from the caller's point of view — await it
 * so the row lands before the response, but nothing it does can fail the
 * request.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const [actor, context] = await Promise.all([
      resolveActor(input.actor),
      requestContext(),
    ]);

    const metadata = input.metadata
      ? (sanitiseValue("metadata", input.metadata) as Record<string, unknown>)
      : null;

    const { error } = await createServiceClient()
      .from("audit_log")
      .insert({
        actor_id: actor.id,
        actor_email: actor.email,
        actor_roles: actor.roles,
        action: input.action,
        section: input.section,
        entity: input.entity,
        entity_id: input.entityId != null ? String(input.entityId) : null,
        entity_label: input.entityLabel ?? null,
        summary: input.summary,
        changes: buildChanges(input),
        metadata,
        method: context.method,
        path: context.path,
        ip: context.ip,
        user_agent: context.user_agent,
      });

    if (error) {
      // The most likely cause by far is the migration not having been applied
      // yet, so say which table is missing rather than just "insert failed".
      console.error("⚠️ Audit log write failed (audit_log):", error.message);
    }
  } catch (err) {
    console.error("⚠️ Audit log write threw:", err);
  }
}

/**
 * Read one row before changing or deleting it, so the entry can carry a real
 * before-state and a human label. Returns null (rather than throwing) when the
 * row has gone, which is exactly the case where the caller is about to 404
 * anyway.
 */
export async function readForAudit(
  table: string,
  id: string | number,
  columns = "*",
  idColumn = "id",
): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await createServiceClient()
      .from(table)
      .select(columns)
      .eq(idColumn, id)
      .maybeSingle();
    return (data as Record<string, unknown> | null) ?? null;
  } catch {
    return null;
  }
}

/** `“Faith Hoodie”` — the label in the quotes the summaries use, or a fallback. */
export function labelOr(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : fallback;
}
