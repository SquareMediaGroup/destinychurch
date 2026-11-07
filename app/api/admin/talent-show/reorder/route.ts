// Admin: set the running order. Body: { ids: string[] } in the new order.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { UUID_RE } from "@/lib/talentShow.server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = body?.ids;
  if (!Array.isArray(ids) || ids.length > 200 || !ids.every((id) => typeof id === "string" && UUID_RE.test(id)))
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });

  const supabase = createServiceClient();
  const results = await Promise.all(
    (ids as string[]).map((id, i) => supabase.from("talent_show_acts").update({ sort_order: i }).eq("id", id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "talent show act",
    entityLabel: "Running order",
    summary: "Changed the talent show running order",
    after: { ids },
  });
  return NextResponse.json({ ok: true });
}
