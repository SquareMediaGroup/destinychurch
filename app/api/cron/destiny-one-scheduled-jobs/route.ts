// Destiny One scheduled jobs (every minute).
//
// Called by Supabase's pg_cron through pg_net (supabase/migrations/
// 20261110_02_destiny_one_scheduled_jobs_cron.sql), because Vercel's Hobby plan
// only allows daily crons. Claims whatever is due in d1_scheduled_jobs and runs
// it: scheduled announcements and poll deadlines. See
// lib/destinyOne/scheduledJobs.server.ts.

import { NextResponse } from "next/server";
import { runDueJobs } from "@/lib/destinyOne/scheduledJobs.server";
import { sendOpsAlert } from "@/lib/destinyOne/opsAlertEmail.server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to run the Destiny One scheduled jobs.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runDueJobs();
    if (summary.claimed > 0) console.log("⏰ Destiny One scheduled jobs:", summary);
    // Something was given up on: say so (the message is left unsent, so a person needs to know).
    if (summary.failed > 0) {
      await sendOpsAlert("scheduled jobs", `${summary.failed} scheduled job(s) failed after 3 tries and were not run.`, "They will not run again on their own");
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Logged, not emailed: this runs every minute, so an outage would send an email a minute.
    // Jobs that give up for good are what raise the alert (above).
    console.error("⚠️ Destiny One scheduled jobs failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
