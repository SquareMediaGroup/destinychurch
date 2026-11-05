// Who DestinyAI is acting for, and how it reaches the existing admin APIs.
//
// DestinyAI does not get its own way of changing the site. Every read and
// write goes through the same route handler the admin page uses — banner,
// popup, posts, featured event — called in-process. That means the handler's
// own validation, its own role checks (the banner's "sitewide is Super Admin
// only"), its revalidation and its audit entry all apply unchanged, and can't
// drift from the page.
//
// What in-process calls skip is middleware, so callRoute() repeats the one
// thing middleware would have done for that path: hasAccess(). The actor
// headers middleware set on *this* request are still in scope (next/headers),
// so recordAudit() inside the handler attributes the change to the admin who
// confirmed it, with this request's path, /api/admin/assistant/..., which is
// how the audit log shows it came through DestinyAI.

import "server-only";
import { headers } from "next/headers";
import { ADMIN_ROLES, NO_ROLES, hasAccess, type RoleFlags } from "@/lib/adminRoles";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";

export interface AgentActor {
  id: string;
  email: string | null;
  roles: RoleFlags;
}

/** The signed-in admin, from the headers middleware set. Null outside /api/admin. */
export async function currentActor(): Promise<AgentActor | null> {
  const h = await headers();
  const id = h.get(AUDIT_ACTOR_HEADERS.id);
  if (!id) return null;
  const granted = new Set((h.get(AUDIT_ACTOR_HEADERS.roles) ?? "").split(","));
  const roles = { ...NO_ROLES };
  for (const role of ADMIN_ROLES) roles[role] = granted.has(role);
  return { id, email: h.get(AUDIT_ACTOR_HEADERS.email) || null, roles };
}

export class AgentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** The check middleware makes for a path, for code that doesn't go through callRoute. */
export function requireAccess(actor: AgentActor, path: string): void {
  if (!hasAccess(actor.roles, path)) {
    throw new AgentError("Your access level doesn't cover this. Ask a Super Admin.", 403);
  }
}

// `never` for the context so any handler shape is accepted: (request) or
// (request, { params: Promise<{ id: string }> }). The call below always passes
// a params promise, which is all a Next route handler reads from it.
type AnyHandler = (request: Request, context: never) => Promise<Response>;
type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/**
 * Call an admin route handler as the current admin. Throws AgentError with the
 * handler's own error message when it refuses, so the model (or the plan
 * card) can say exactly why.
 */
export async function callRoute<T = unknown>(
  actor: AgentActor,
  path: string,
  handler: AnyHandler,
  {
    method = "GET",
    body,
    params = {},
    query,
  }: {
    method?: "GET" | "PUT" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, string>;
  } = {},
): Promise<T> {
  requireAccess(actor, path);
  const url = new URL(path, "http://destinyai.internal");
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  const request = new Request(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await (handler as unknown as Handler)(request, { params: Promise.resolve(params) });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new AgentError(data?.error ?? `The request failed (${response.status}).`, response.status);
  }
  return data as T;
}
