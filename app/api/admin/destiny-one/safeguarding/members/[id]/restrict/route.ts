import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { adminRestrictSchema } from "@/lib/destinyOne/schemas";

// POST   /api/admin/destiny-one/safeguarding/members/[id]/restrict  { days: 1|7|30, reason }
// DELETE /api/admin/destiny-one/safeguarding/members/[id]/restrict  (lift early)
//
// A timed posting restriction: the member keeps reading their groups and still
// counts towards each group's rules, but can't post or react until the date.
// It lifts itself (the database compares against now(); see migration
// 20261011_01). Lighter than suspend, which drops them out of every group.

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

async function loadMember(memberId: string) {
  const { data } = await createServiceClient()
    .from("d1_members")
    .select("id, display_name, status, posting_restricted_until")
    .eq("id", memberId)
    .maybeSingle();
  return data && data.status !== "deleted" ? data : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const memberId = (await params).id;

  const body = await parseBody(request, adminRestrictSchema);
  if ("response" in body) return body.response;
  const { days, reason } = body.data;

  const member = await loadMember(memberId);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const until = new Date(Date.now() + days * DAY_MS).toISOString();
  const { error } = await createServiceClient()
    .from("d1_members")
    .update({ posting_restricted_until: until })
    .eq("id", memberId);
  if (error) return dbFailure(error);

  await recordAudit({
    action: "moderate",
    section: "safeguarding",
    entity: "app member",
    entityId: memberId,
    entityLabel: member.display_name,
    summary: `Restricted "${member.display_name}" from posting in Destiny One for ${days} day${days === 1 ? "" : "s"}`,
    before: { posting_restricted_until: member.posting_restricted_until },
    after: { posting_restricted_until: until },
    metadata: { reason, days },
  });
  return NextResponse.json({ ok: true, restrictedUntil: until });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const memberId = (await params).id;

  const member = await loadMember(memberId);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await createServiceClient()
    .from("d1_members")
    .update({ posting_restricted_until: null })
    .eq("id", memberId);
  if (error) return dbFailure(error);

  await recordAudit({
    action: "moderate",
    section: "safeguarding",
    entity: "app member",
    entityId: memberId,
    entityLabel: member.display_name,
    summary: `Lifted the posting restriction on "${member.display_name}" in Destiny One`,
    before: { posting_restricted_until: member.posting_restricted_until },
    after: { posting_restricted_until: null },
  });
  return NextResponse.json({ ok: true });
}
