import { NextResponse } from "next/server";
import { adultOnFromDateOfBirth, todayInLondon } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { getMember } from "@/lib/destinyOne/adminData.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { adultOnForDecision } from "@/lib/destinyOne/onboarding";
import { adminApproveSchema } from "@/lib/destinyOne/schemas";

// POST /api/admin/destiny-one/members/[id]/approve
//   { adult, dateOfBirth?, displayName?, communityIds? }
//
// Approves an access request. The admin decides adult or under-18 — what the
// person declared about themselves is shown to help, but never decides it.
// Optionally corrects their name and puts them straight into communities.

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const body = await parseBody(request, adminApproveSchema);
  if ("response" in body) return body.response;
  const input = body.data;

  const before = await getMember(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status === "active") return NextResponse.json({ error: "Already approved." }, { status: 409 });

  const decided = adultOnForDecision(input, todayInLondon(), adultOnFromDateOfBirth);
  if (!decided.ok) return NextResponse.json({ error: decided.error }, { status: 422 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("d1_members")
    .update({
      ...(input.displayName ? { display_name: input.displayName } : {}),
      adult_on: decided.adultOn,
      status: "active",
      verified_at: new Date().toISOString(),
      verified_by: admin.userId,
      verification_source: "admin",
    })
    .eq("id", id);
  if (error) return dbFailure(error);

  for (const communityId of input.communityIds) {
    const { error: joinError } = await supabase.rpc("d1_admin_add_community_members", {
      p_community: communityId,
      p_members: [id],
      p_role: "member",
    });
    if (joinError) console.error("⚠️ Destiny One approve: community join failed:", joinError.message);
  }

  const name = input.displayName ?? before.displayName;
  await recordAudit({
    action: "approve",
    section: "destiny_one",
    entity: "access request",
    entityId: id,
    entityLabel: name,
    summary: `Approved ${name} for Destiny One as ${decided.adultOn && decided.adultOn <= todayInLondon() ? "an adult" : "under 18"}`,
    metadata: { communityIds: input.communityIds, dateOfBirthGiven: Boolean(input.dateOfBirth) },
  });
  return NextResponse.json({ member: await getMember(id) });
}
