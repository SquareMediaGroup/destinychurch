import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { currentEditorName } from "@/lib/posts-admin.server";

// audit-exempt: a heartbeat from an open editor ("Sam is editing"). It records
// who has the page open, not a change to anything; the saves themselves are
// audited by the posts routes.

/** Seen within this long counts as "editing now". The editor beats every 20s. */
const FRESH_MS = 60_000;

/** Records this admin as editing the post and returns everyone else who is. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = (await headers()).get(AUDIT_ACTOR_HEADERS.id);
  if (!me) return NextResponse.json({ others: [] });
  const supabase = createServiceClient();
  const now = Date.now();

  const { error } = await supabase.from("post_editing").upsert({
    post_id: id,
    auth_user_id: me,
    name: (await currentEditorName(supabase)) ?? "Another admin",
    seen_at: new Date(now).toISOString(),
  });
  if (error) return NextResponse.json({ others: [], error: error.message });

  // Sweep stale rows now and then (any table-wide stale row, not just this post's).
  if (Math.random() < 0.1) {
    await supabase.from("post_editing").delete().lt("seen_at", new Date(now - 10 * FRESH_MS).toISOString());
  }

  const { data } = await supabase
    .from("post_editing")
    .select("auth_user_id, name, seen_at")
    .eq("post_id", id)
    .neq("auth_user_id", me)
    .gte("seen_at", new Date(now - FRESH_MS).toISOString());
  return NextResponse.json({ others: (data ?? []).map((r) => ({ name: r.name ?? "Another admin" })) });
}

/** The editor closed. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const me = (await headers()).get(AUDIT_ACTOR_HEADERS.id);
  if (me) await createServiceClient().from("post_editing").delete().eq("post_id", id).eq("auth_user_id", me);
  return NextResponse.json({ ok: true });
}
