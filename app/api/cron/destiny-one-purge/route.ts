// Destiny One retention (daily 04:15).
//
// Deletes messages older than D1_MESSAGE_RETENTION_DAYS (default 365), the
// files that went with them, erased ("Former member") accounts that no longer
// own any message, and closed reports / resolved safeguarding events past the
// same window. The deletion itself is d1_purge_expired() in
// supabase/migrations/20260926_01_destiny_one.sql; this route removes the
// storage objects it hands back.
//
// ⚠️ The retention period is a safeguarding-policy decision (scoping doc D6)
// that has not been signed off yet. 365 days is a placeholder: set
// D1_MESSAGE_RETENTION_DAYS once it is agreed, and update
// docs/destiny-one-gdpr.md and the privacy notice to match. The SQL never
// goes below 30 days, whatever this is set to.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { MEDIA_BUCKET } from "@/lib/destinyOne/chat.server";

export const dynamic = "force-dynamic";

const DEFAULT_RETAIN_DAYS = 365;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to purge Destiny One messages.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = Number(process.env.D1_MESSAGE_RETENTION_DAYS);
  const retainDays = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_RETAIN_DAYS;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("d1_purge_expired", { p_retain_days: retainDays });
  if (error) {
    console.error("⚠️ Destiny One purge failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (Array.isArray(data) ? data[0] : data) as {
    messages_deleted: number;
    attachment_paths: string[];
    members_deleted: number;
  };

  const paths = result?.attachment_paths ?? [];
  for (let i = 0; i < paths.length; i += 100) {
    const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove(paths.slice(i, i + 100));
    if (removeError) console.error("⚠️ Destiny One media removal failed:", removeError.message);
  }

  console.log("🧹 Destiny One purge:", { retainDays, ...result, attachment_paths: paths.length });
  return NextResponse.json({
    ok: true,
    retainDays,
    messagesDeleted: result?.messages_deleted ?? 0,
    filesDeleted: paths.length,
    membersDeleted: result?.members_deleted ?? 0,
  });
}
