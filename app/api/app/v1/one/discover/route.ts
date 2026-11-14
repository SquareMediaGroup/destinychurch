import type { D1DiscoverGroup } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/discover
//
// Groups open to new people, in communities the caller already belongs to (the
// app stays invite-only: this never shows a group in a community they aren't in),
// that they aren't already in. An under-18 only ever gets groups a safeguarding
// admin has marked suitable for under-18s: d1_can_discover is the one test, in
// the database, and is checked again when they ask and when a leader approves.

export const dynamic = "force-dynamic";

interface Row {
  group_id: string;
  community_id: string;
  community_name: string;
  name: string;
  blurb: string | null;
  meeting_day: number | null;
  meeting_area: string | null;
  u18_suitable: boolean;
  member_count: number;
  request_id: number | null;
  declined_until: string | null;
}

export const GET = oneRoute(async (request) => {
  const caller = await requireMember(request);
  await limit("discover", caller.member.id, 60);
  const { data, error } = await createServiceClient().rpc("d1_discover_groups", { p_actor: caller.member.id });
  if (error) throw fromDbError(error);
  const groups: D1DiscoverGroup[] = ((data ?? []) as Row[]).map((r) => ({
    groupId: r.group_id,
    communityId: r.community_id,
    communityName: r.community_name,
    name: r.name,
    blurb: r.blurb,
    meetingDay: r.meeting_day,
    meetingArea: r.meeting_area,
    u18Suitable: r.u18_suitable,
    memberCount: r.member_count,
    requestId: r.request_id,
    declinedUntil: r.declined_until,
  }));
  return oneJson(groups);
});
