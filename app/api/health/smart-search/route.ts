import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { getSmartSearchStatus, setSmartSearchStatus } from "@/lib/serviceStatus";
import { sendSmartSearchAlert } from "@/lib/smartSearchAlertEmail";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const PING_TIMEOUT_MS = 15_000;

/** Authorize Vercel Cron (Authorization: Bearer <CRON_SECRET>) or a manual ?secret= run. */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured (e.g. local/dev) → allow
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

/** Live OpenAI ping. Returns ok=false with a reason on any failure/timeout. */
async function pingOpenAI(): Promise<{ ok: boolean; reason: string | null }> {
  const openai = getOpenAI();
  if (!openai) return { ok: false, reason: "OPENAI_API_KEY not configured" };
  try {
    const res = await openai.chat.completions.create(
      { model: SMART_SEARCH_MODEL, max_tokens: 1, messages: [{ role: "user", content: "ping" }] },
      { timeout: PING_TIMEOUT_MS, maxRetries: 0 },
    );
    if (res.choices?.[0]) return { ok: true, reason: null };
    return { ok: false, reason: "Empty response from OpenAI" };
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : "Unknown OpenAI error";
    return { ok: false, reason: reason.slice(0, 300) };
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getSmartSearchStatus();
  const now = Date.now();

  // While healthy, only actually ping once the daily check is due — the cron
  // fires hourly so it can retry quickly while down, but stays daily when up.
  const due = !status.nextCheckAt || now >= new Date(status.nextCheckAt).getTime();
  if (status.enabled && !due) {
    return NextResponse.json({ skipped: true, enabled: true, nextCheckAt: status.nextCheckAt });
  }

  const { ok, reason } = await pingOpenAI();

  if (ok) {
    const recovered = !status.enabled;
    await setSmartSearchStatus({
      enabled: true,
      reason: null,
      nextCheckAt: new Date(now + DAY_MS).toISOString(),
      consecutiveFailures: 0,
    });
    if (recovered) {
      await sendSmartSearchAlert("recovered", { failures: status.consecutiveFailures });
    }
    return NextResponse.json({ ok: true, enabled: true, recovered });
  }

  // Failure → disable, retry hourly, alert on the healthy→down transition only.
  const wasEnabled = status.enabled;
  const failures = status.consecutiveFailures + 1;
  await setSmartSearchStatus({
    enabled: false,
    reason,
    nextCheckAt: new Date(now + HOUR_MS).toISOString(),
    consecutiveFailures: failures,
  });
  if (wasEnabled) {
    await sendSmartSearchAlert("down", { reason, failures });
  }
  return NextResponse.json({ ok: false, enabled: false, reason, consecutiveFailures: failures });
}
