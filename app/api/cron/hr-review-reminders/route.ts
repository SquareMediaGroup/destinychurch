// Daily digest of HR reviews coming up in the next two weeks.
//
// hr_reviews.reviewer is free text, not a linked account, so there's no
// per-reviewer address to target — one digest goes to the HR inbox instead.
// This route is NOT under /api/admin, so middleware.ts doesn't guard it. It
// authorises with CRON_SECRET instead, the way live-chat-purge does.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { fullName, REVIEW_TYPE_LABELS, type ReviewType } from "@/lib/hr";
import { sendReviewReminderDigest } from "@/lib/hrEmail";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 14;

// supabase-js has no FK metadata to infer cardinality without generated DB
// types, so the select-string parser defaults hr_staff(...) to an array.
// hr_reviews.staff_id → hr_staff is actually to-one; cast explicitly.
interface DueReview {
  id: string;
  type: string;
  reviewer: string | null;
  next_review_date: string | null;
  hr_staff: { first_name: string; last_name: string } | null;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Fail closed. An unset secret would make this an open "send an email on
  // demand" endpoint, which is worse than the cron silently not running.
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to run HR review reminders.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);

  // No lower bound: an overdue review that was never reminded should still
  // surface, not silently drop off once its date has passed.
  const { data: rows, error } = await supabase
    .from("hr_reviews")
    .select("id, type, reviewer, next_review_date, hr_staff(first_name, last_name)")
    .is("reminder_sent_at", null)
    .not("next_review_date", "is", null)
    .lte("next_review_date", windowEnd.toISOString().slice(0, 10));

  if (error) {
    console.error("⚠️ HR review reminder query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = (rows ?? []) as unknown as DueReview[];

  if (due.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  await sendReviewReminderDigest(
    due.map((r) => ({
      staffName: r.hr_staff ? fullName(r.hr_staff) : "Unknown",
      type: REVIEW_TYPE_LABELS[r.type as ReviewType] ?? r.type,
      reviewer: r.reviewer,
      nextReviewDate: r.next_review_date!,
    })),
  );

  const { error: updateError } = await supabase
    .from("hr_reviews")
    .update({ reminder_sent_at: new Date().toISOString() })
    .in("id", due.map((r) => r.id));

  if (updateError) {
    console.error("⚠️ HR review reminder mark-sent failed:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  console.log("📬 HR review reminders sent:", due.length);
  return NextResponse.json({ ok: true, sent: due.length });
}
