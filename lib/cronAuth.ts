// The one guard every scheduled endpoint shares (app/api/cron/*, and the
// Smart Search health check).
//
// Vercel Cron and the GitHub Actions schedules both call with
// `Authorization: Bearer <CRON_SECRET>`. Nothing else is accepted: not a query
// string (a secret in a URL ends up in access logs and browser history), and
// not "no secret configured", which would turn a job that emails people or
// deletes rows into an endpoint anyone can run.

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Constant-time string comparison. Hashing first makes the lengths equal. */
function sameSecret(a: string, b: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * The response to send when this call may not run the job, or null when it may.
 *
 * Fails closed: 503 when CRON_SECRET isn't set (and says so in the log, naming
 * the job, so a cron that silently stopped can be found), 401 on a missing or
 * wrong bearer token.
 *
 *   const refused = refuseCron(request, "run HR review reminders");
 *   if (refused) return refused;
 */
export function refuseCron(request: Request, job: string): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(`⚠️ CRON_SECRET is not set — refusing to ${job}.`);
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!sameSecret(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
