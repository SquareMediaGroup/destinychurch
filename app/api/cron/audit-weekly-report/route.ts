// The end-of-week admin activity report.
//
// Runs Sunday evening (see vercel.json), covering the seven days up to that
// point — so a church week that ends with Sunday services is reported after
// them, not halfway through. Reads the audit log, has the model write a short
// report over numbers that were computed in code, stores it, and emails every
// Super Admin.
//
// Like the other crons, this route is NOT under /api/admin, so middleware.ts
// doesn't guard it: it authorises with CRON_SECRET the way live-chat-purge and
// hr-review-reminders do.
//
// Two deliberate divisions of labour:
//
//   • The *numbers* are counted in SQL-land here, and passed to the model as
//     facts. A model asked to both count and summarise will occasionally do
//     neither well, and a report whose totals can't be trusted is worse than no
//     report.
//   • The *judgement* — what mattered this week, what's worth a second look —
//     is the model's, because that is the part a table of counts can't do.
//
// It also runs the retention purge, so the log doesn't grow without limit. That
// lives here rather than in its own cron because deleting old entries is only
// safe once the week containing them has been summarised and sent.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { sendAuditReportEmail, type AuditReportStat } from "@/lib/auditEmail";
import { actionLabel, sectionLabel, type AuditEntry } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PERIOD_DAYS = 7;
/** Entries read for one report. A busy week here is a few hundred. */
const MAX_ENTRIES = 3000;
/** Summaries handed to the model. Past this it gets counts, not lines. */
const MAX_LINES = 250;

/** How long entries are kept. A year covers "what changed last Christmas". */
const RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS) || 365;

function tally(entries: AuditEntry[], key: keyof AuditEntry): Record<string, number> {
  const out: Record<string, number> = {};
  for (const entry of entries) {
    const value = String(entry[key] ?? "unknown");
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

function sorted(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Who to send to: the env override, or every Super Admin in admin_roles. */
async function recipients(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<string[]> {
  const override = process.env.AUDIT_REPORT_EMAIL;
  if (override) {
    return override.split(",").map((e) => e.trim()).filter(Boolean);
  }

  const { data } = await supabase
    .from("admin_roles")
    .select("email")
    .eq("super_admin", true);

  return (data ?? [])
    .map((row) => (row as { email: string | null }).email)
    .filter((email): email is string => Boolean(email));
}

/**
 * Ask the model to write the report.
 *
 * Returns null when there's no API key or the call fails — the caller still
 * sends the email, just with a plainly-worded fallback instead of prose. A
 * missing narrative shouldn't cost the week's numbers.
 */
async function writeReport(
  periodLabel: string,
  stats: Record<string, unknown>,
  lines: string[],
): Promise<{ headline: string; body: string } | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: SMART_SEARCH_MODEL,
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: `You write the weekly admin-activity report for Destiny Church Tees Valley's website, read by its Super Admins.

You are given counts that were computed from the database — they are correct, use them as given and never recompute or contradict them — plus the individual entries.

Write:
1. A first line starting "HEADLINE: " — one short sentence naming the week's most notable thing (max 70 characters, no full stop).
2. Then the report itself, in markdown:
   - Two or three short paragraphs on what happened and what it amounts to.
   - A "## Worth a look" section ONLY if something genuinely warrants it — a deletion, an access change, a refund, an unusual burst of activity, a failed sign-in. Say why in one line each. Omit the section entirely if the week was routine; do not invent concerns.
   - No other headings. No greeting, no sign-off, no restating the counts as a list — the email already shows them.

Style: British English, plain and factual, past tense. Name people by the email address in the entries. A quiet week should read as a quiet week, in two sentences, not padded out.`,
        },
        {
          role: "user",
          content: `Period: ${periodLabel}

Counts (authoritative):
${JSON.stringify(stats, null, 2)}

Entries (newest first${lines.length >= MAX_LINES ? `, showing the most recent ${MAX_LINES}` : ""}):
${lines.join("\n") || "(nothing was recorded this week)"}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return null;

    const [first, ...rest] = text.split("\n");
    const headline = first.replace(/^HEADLINE:\s*/i, "").trim();
    const body = rest.join("\n").trim();

    // If the model skipped the HEADLINE line, treat the whole thing as body
    // rather than eating its first sentence as a title.
    return headline && body
      ? { headline, body }
      : { headline: `Admin activity — ${periodLabel}`, body: text };
  } catch (error) {
    console.error("⚠️ Weekly audit report generation failed:", error);
    return null;
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Fail closed, same as the other crons: an unset secret would make this an
  // open "email every Super Admin on demand" endpoint.
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to run the audit report.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - PERIOD_DAYS);

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .gte("created_at", periodStart.toISOString())
    .lte("created_at", periodEnd.toISOString())
    .order("id", { ascending: false })
    .limit(MAX_ENTRIES);

  if (error) {
    console.error("⚠️ Weekly audit report query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []) as AuditEntry[];
  const periodLabel = `${formatDay(periodStart.toISOString())} – ${formatDay(
    periodEnd.toISOString(),
  )}`;

  const byActor = sorted(tally(entries, "actor_email"));
  const bySection = sorted(tally(entries, "section"));
  const byAction = sorted(tally(entries, "action"));

  const stats = {
    total: entries.length,
    people: byActor.length,
    by_person: Object.fromEntries(byActor),
    by_section: Object.fromEntries(
      bySection.map(([key, count]) => [sectionLabel(key), count]),
    ),
    by_action: Object.fromEntries(
      byAction.map(([key, count]) => [actionLabel(key), count]),
    ),
    deletions: entries.filter((e) => e.action === "delete").length,
    access_changes: entries.filter((e) => e.section === "users").length,
    failed_sign_ins: entries.filter(
      (e) => e.action === "login" && e.metadata?.ok === false,
    ).length,
  };

  const lines = entries
    .slice(0, MAX_LINES)
    .map(
      (entry) =>
        `${new Date(entry.created_at).toLocaleString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })} — ${entry.actor_email ?? "system"} — ${entry.summary}`,
    );

  const written = await writeReport(periodLabel, stats, lines);
  const headline =
    written?.headline ??
    (entries.length === 0
      ? "A quiet week — nothing was changed in the admin"
      : `${entries.length} change${entries.length === 1 ? "" : "s"} across the admin this week`);
  const body =
    written?.body ??
    (entries.length === 0
      ? "No admin activity was recorded in this period."
      : `${entries.length} entries were recorded by ${byActor.length} ${
          byActor.length === 1 ? "person" : "people"
        }. Open the audit log for the detail.`);

  const to = await recipients(supabase);

  // Store before sending: a Resend failure shouldn't lose the report, and the
  // unique index on (period_start, period_end) means a re-run updates this
  // week's report rather than adding a second one.
  const { error: saveError } = await supabase.from("audit_reports").upsert(
    {
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      headline,
      body,
      stats,
      entry_count: entries.length,
      emailed_to: to,
    },
    { onConflict: "period_start,period_end" },
  );
  if (saveError) {
    console.error("⚠️ Weekly audit report save failed:", saveError.message);
  }

  const statTiles: AuditReportStat[] = [
    { label: "Changes", value: String(entries.length) },
    { label: "People", value: String(byActor.length) },
    { label: "Deletions", value: String(stats.deletions) },
  ];

  try {
    await sendAuditReportEmail({
      to,
      periodLabel,
      headline,
      body,
      stats: statTiles,
      people: byActor
        .slice(0, 10)
        .map(([email, count]) => `${email} — ${count} change${count === 1 ? "" : "s"}`),
    });
  } catch (err) {
    console.error("⚠️ Weekly audit report email failed:", err);
  }

  // Retention purge — see the note at the top of this file for why it lives here.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const { error: purgeError } = await supabase
    .from("audit_log")
    .delete()
    .lt("created_at", cutoff.toISOString());
  if (purgeError) {
    console.error("⚠️ Audit log purge failed:", purgeError.message);
  }

  console.log(
    `📊 Weekly audit report: ${entries.length} entries, emailed to ${to.length} Super Admin(s).`,
  );
  return NextResponse.json({
    ok: true,
    entries: entries.length,
    emailed: to.length,
    generated: Boolean(written),
  });
}
