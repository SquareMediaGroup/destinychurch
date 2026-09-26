// Destiny One — response helpers for /api/app/v1/one/*.
//
// Same envelope as the rest of the app BFF (lib/appApi.ts), but every response
// here is about one signed-in person, so it is always `private, no-store`:
// nothing from these routes may ever sit in a shared/edge cache.
//
// Errors are `{ error: { code, message } }`. `code` is stable and the app
// branches on it; `message` is plain copy the app can show as-is.

import { NextResponse } from "next/server";
import type { D1Envelope, D1ErrorCode } from "@destiny/shared";
import { APP_API_VERSION } from "@/lib/appApi";
import { checkRateLimit } from "@/lib/rateLimit";

const NO_STORE = {
  "Cache-Control": "private, no-store",
  "X-App-Api-Version": String(APP_API_VERSION),
};

export function oneJson<T>(data: T, httpStatus = 200): NextResponse {
  const body: D1Envelope<T> = {
    status: "ok",
    generatedAt: new Date().toISOString(),
    data,
    notice: null,
  };
  return NextResponse.json(body, { status: httpStatus, headers: NO_STORE });
}

const STATUS_FOR: Record<D1ErrorCode, number> = {
  unauthenticated: 401,
  access_request_needed: 403,
  not_verified: 403,
  consent_required: 403,
  forbidden: 403,
  not_found: 404,
  invalid: 400,
  rule_violation: 422,
  rate_limited: 429,
  unavailable: 503,
};

/** Thrown anywhere inside a handler wrapped by `oneRoute`; becomes the error response. */
export class OneError extends Error {
  constructor(
    readonly code: D1ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OneError";
  }
}

export function oneError(code: D1ErrorCode, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status: STATUS_FOR[code], headers: NO_STORE });
}

/**
 * Maps a Postgres error from a d1_* function onto an API error.
 *
 * The SQL functions raise with deliberate SQLSTATEs and messages written for
 * people ("A group needs at least 2 verified adults."), so the message passes
 * straight through for the codes we raise ourselves. Anything else is a bug
 * and is reported generically — its text may name tables and columns.
 */
export function fromDbError(error: { code?: string; message: string }): OneError {
  switch (error.code) {
    case "P0001":
      return new OneError("rule_violation", error.message);
    case "42501":
      return new OneError("forbidden", error.message);
    case "P0002":
      return new OneError("not_found", error.message);
    case "22023":
      return new OneError("invalid", error.message);
    default:
      console.error("⚠️ Destiny One database error:", error.code, error.message);
      return new OneError("unavailable", "Something went wrong. Please try again.");
  }
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Wraps a route handler so a thrown OneError becomes a proper response. */
export function oneRoute<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof OneError) return oneError(err.code, err.message);
      console.error("⚠️ Destiny One route failed:", err);
      return oneError("unavailable", "Something went wrong. Please try again.");
    }
  };
}

/** Parses a JSON body against a zod schema, or throws `invalid`. */
export async function readBody<T>(
  request: Request,
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } },
): Promise<T> {
  const raw = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    throw new OneError("invalid", parsed.error.issues[0]?.message ?? "That request wasn't valid.");
  }
  return parsed.data;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: string, what = "id"): string {
  if (!UUID_RE.test(value)) throw new OneError("not_found", `That ${what} doesn't exist.`);
  return value.toLowerCase();
}

export function requireMessageId(value: string): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new OneError("not_found", "That message doesn't exist.");
  return n;
}

/**
 * Per-member rate limit, namespaced so endpoints don't trip each other.
 * lib/rateLimit.ts is per-instance in-memory — a speed bump against a runaway
 * client or a spammer, not a hard guarantee.
 */
export function limit(scope: string, memberOrIp: string, max: number): void {
  if (checkRateLimit(`d1:${scope}:${memberOrIp}`, max).limited) {
    throw new OneError("rate_limited", "You're doing that a lot. Please wait a few minutes and try again.");
  }
}

export type IdParams = { params: Promise<{ id: string }> };
