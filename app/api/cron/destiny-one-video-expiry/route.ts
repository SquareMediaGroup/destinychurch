// Destiny One video expiry (daily 04:45).
//
// Videos are kept for 28 days. d1_expire_videos() (supabase/migrations/
// 20261026_01_destiny_one_video.sql) marks the ones past their date as expired
// and hands back their storage paths; this route deletes those files. The
// message and its attachment row stay, so the chat shows "Video expired".
//
// A video under a report that isn't closed, or one a safeguarding lead has put
// a hold on, is skipped by the SQL and keeps its file.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { MEDIA_BUCKET } from "@/lib/destinyOne/chat.server";
import { sendOpsAlert } from "@/lib/destinyOne/opsAlertEmail.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to expire Destiny One videos.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("d1_expire_videos");
  if (error) {
    console.error("⚠️ Destiny One video expiry failed:", error.message);
    await sendOpsAlert("video expiry", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : data) as { attachment_paths: string[] } | null;
  const paths = row?.attachment_paths ?? [];
  let removeFailures = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove(paths.slice(i, i + 100));
    if (removeError) {
      removeFailures += 1;
      console.error("⚠️ Destiny One video removal failed:", removeError.message);
    }
  }
  if (removeFailures) {
    await sendOpsAlert("video expiry", `${removeFailures} batch(es) of expired videos couldn't be deleted from storage.`);
  }

  console.log("🧹 Destiny One video expiry:", { filesDeleted: paths.length, removeFailures });
  return NextResponse.json({ ok: true, filesDeleted: paths.length, removeFailures });
}
