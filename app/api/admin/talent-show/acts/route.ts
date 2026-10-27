// Admin: add a talent show act. New acts go to the end of the running order.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { cleanAct } from "@/lib/talentShow.server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const clean = cleanAct(body);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });

  const supabase = createServiceClient();
  const { data: last } = await supabase
    .from("talent_show_acts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("talent_show_acts")
    .insert({ ...clean.patch, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("id, name")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "announcements",
    entity: "talent show act",
    entityId: data.id,
    entityLabel: data.name,
    summary: `Added the talent show act “${data.name}”`,
    after: clean.patch,
  });
  return NextResponse.json({ ok: true, id: data.id });
}
