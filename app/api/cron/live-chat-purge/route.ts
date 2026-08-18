// Seven-day retention for the live chat.
//
// Long enough that a safeguarding concern raised the following Sunday can still
// be looked into; short enough that we aren't sitting on an indefinite pile of
// people's messages. The deletion itself is live_chat_purge() in
// supabase/migrations/20260817_live_chat.sql — a single SQL function so the
// whole sweep is one round trip and one transaction.
//
// This route is NOT under /api/admin, so middleware.ts doesn't guard it. It
// authorises with CRON_SECRET instead, the way a scheduled caller has to.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export const dynamic = "force-dynamic";

const RETAIN_DAYS = 7;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Fail closed. An unset secret makes this an open "delete the chat history"
  // endpoint, which is worse than the cron silently not running.
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to purge live chat.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("live_chat_purge", {
    retain_days: RETAIN_DAYS,
  });

  if (error) {
    console.error("⚠️ live chat purge failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  console.log("🧹 live chat purge:", result);

  return NextResponse.json({ ok: true, retainDays: RETAIN_DAYS, ...result });
}
