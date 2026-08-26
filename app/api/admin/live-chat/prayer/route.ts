// The prayer queue.
//
// Auth comes free: middleware.ts + the `host` ROUTE_RULES entry.
//
// Claiming is what stops two people praying for the same request while a third
// waits — `claimed_by` is the whole coordination mechanism, deliberately simple.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readHost } from "@/lib/liveChatAuth";
import { recordAudit } from "@/lib/audit.server";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "praying", "done"] as const;
type PrayerStatus = (typeof STATUSES)[number];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");

  const supabase = createServiceClient();
  let query = supabase
    .from("live_chat_prayer_requests")
    .select("id, session_id, display_name, body, status, claimed_by, claimed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { requests: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const host = await readHost();
  if (!host) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: { id?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;

  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }
  if (typeof status !== "string" || !STATUSES.includes(status as PrayerStatus)) {
    return NextResponse.json(
      { error: "Status must be new, praying or done." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("live_chat_prayer_requests")
    .update({
      status,
      // Picking it up claims it; putting it back releases it, so someone else
      // can take over if they get called away.
      claimed_by: status === "new" ? null : host.userId,
      claimed_at: status === "new" ? null : new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, display_name, body, status, claimed_by, claimed_at, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No such request." }, { status: 404 });

  // The request someone typed is not copied into the log — who picked it up and
  // when is what the queue needs to be accountable for.
  await recordAudit({
    action: "update",
    section: "live",
    entity: "prayer request",
    entityId: id,
    entityLabel: data.display_name ?? "Guest",
    summary:
      status === "praying"
        ? `Picked up the prayer request from ${data.display_name ?? "a guest"}`
        : status === "done"
          ? `Marked the prayer request from ${data.display_name ?? "a guest"} as prayed for`
          : `Put the prayer request from ${data.display_name ?? "a guest"} back in the queue`,
    changes: { status: { from: null, to: status } },
  });

  return NextResponse.json({ request: data });
}
