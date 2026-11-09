import { NextRequest, NextResponse } from "next/server";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { getSmartSearchStatus, setSmartSearchStatus } from "@/lib/serviceStatus";
import { sendSmartSearchAlert } from "@/lib/smartSearchAlertEmail";
import { refuseCron } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;
const PING_TIMEOUT_MS = 15_000;

// Run hourly by .github/workflows/smart-search-health.yml (the Vercel Hobby
// plan only allows daily crons, and a daily one couldn't retry hourly while
// OpenAI is down). Same CRON_SECRET bearer guard as app/api/cron/*: it used to
// run for anyone when the secret was unset and to accept the secret in the
// query string, and this endpoint spends OpenAI credit and sends alert emails.

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
  const refused = refuseCron(request, "run the Smart Search health check");
  if (refused) return refused;

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
