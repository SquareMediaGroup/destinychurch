// Destiny One prayer summary (daily 18:30).
//
// "I prayed" taps notify nobody as they happen. A member who has opted in
// (Notifications in the app; off by default) gets one notification a day saying
// how many people prayed for their requests in the last 24 hours, with no
// names and none of the request's text. d1_prayer_summary_due() (supabase/
// migrations/20261112_01_destiny_one_prayer_requests.sql) works out who.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { pushNotice } from "@/lib/destinyOne/push.server";
import { sendOpsAlert } from "@/lib/destinyOne/opsAlertEmail.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to send the Destiny One prayer summary.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await createServiceClient().rpc("d1_prayer_summary_due");
  if (error) {
    console.error("⚠️ Destiny One prayer summary failed:", error.message);
    await sendOpsAlert("prayer summary", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as { member_id: string; people: number }[];
  for (const row of rows) {
    const text = row.people === 1 ? "1 person prayed for you today." : `${row.people} people prayed for you today.`;
    await pushNotice(row.member_id, "Destiny One", text, { prayerSummary: true });
  }
  console.log("🙏 Destiny One prayer summary:", { sent: rows.length });
  return NextResponse.json({ ok: true, sent: rows.length });
}
