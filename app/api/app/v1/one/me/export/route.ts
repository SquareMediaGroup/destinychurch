import type { D1Export, D1FeedbackKind, D1FeedbackStatus } from "@destiny/shared";
import { isAdult } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { authenticate, avatarUrl, loadConsents, loadMemberByAuthUser } from "@/lib/destinyOne/auth.server";
import { MEDIA_BUCKET } from "@/lib/destinyOne/chat.server";
import { OneError, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/me/export
//
// GDPR right of access: everything Destiny One holds about the caller, as
// JSON — profile (including what they said in an access request and how they
// were verified), consents, memberships, their own messages (including ones
// they deleted, since we still hold those), the files they sent, their
// reactions, the people they've blocked, the reports they made and the
// problems and feedback they sent. Other
// people's messages are not "their" data and are not included. Files and the
// profile picture come as short-lived links rather than inline.

export const dynamic = "force-dynamic";

/** Long enough to download everything after the share sheet opens. */
const FILE_URL_TTL = 24 * 60 * 60;

export const GET = oneRoute(async (request) => {
  const user = await authenticate(request);
  await limit("export", user.id, 3);
  const member = await loadMemberByAuthUser(user.id);
  if (!member) throw new OneError("not_found", "We don't hold any Destiny One data for this account.");

  const supabase = createServiceClient();
  const [consents, extra, communities, groups, messages, attachments, reactions, blocks, reports, feedback, picture] = await Promise.all([
    loadConsents(member.id),
    supabase
      .from("d1_members")
      .select("declared_adult_on, request_note")
      .eq("id", member.id)
      .maybeSingle(),
    supabase
      .from("d1_community_members")
      .select("role, joined_at, d1_communities!inner(id, name)")
      .eq("member_id", member.id),
    supabase
      .from("d1_group_members")
      .select("role, joined_at, left_at, d1_groups!inner(id, name)")
      .eq("member_id", member.id),
    supabase
      .from("d1_messages")
      .select("id, group_id, body, created_at, deleted_at")
      .eq("sender_id", member.id)
      .order("id", { ascending: true }),
    supabase
      .from("d1_attachments")
      .select("id, group_id, storage_path, mime_type, size_bytes, created_at")
      .eq("uploader_id", member.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("d1_reactions")
      .select("message_id, emoji, created_at")
      .eq("member_id", member.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("d1_blocks")
      .select("created_at, blocked:d1_members!d1_blocks_blocked_id_fkey(id, display_name)")
      .eq("blocker_id", member.id),
    supabase
      .from("d1_reports")
      .select("id, reason, created_at, status")
      .eq("reporter_id", member.id),
    supabase
      .from("d1_feedback")
      .select("id, kind, body, created_at, status")
      .eq("member_id", member.id)
      .order("created_at", { ascending: true }),
    avatarUrl(member.avatar_url),
  ]);

  const files = attachments.data ?? [];
  const signed = files.length
    ? await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(
        files.map((f) => f.storage_path as string),
        FILE_URL_TTL,
      )
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlFor = new Map((signed.data ?? []).map((s) => [s.path, s.signedUrl]));

  const body: D1Export = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: member.id,
      displayName: member.display_name,
      status: member.status,
      roles: member.roles ?? [],
      isAdult: isAdult(member.adult_on),
      adultOn: member.adult_on,
      declaredAdultOn: (extra.data?.declared_adult_on as string | null | undefined) ?? null,
      requestNote: (extra.data?.request_note as string | null | undefined) ?? null,
      requestSubmittedAt: member.request_submitted_at,
      verifiedAt: member.verified_at,
      verification: member.verification_source,
      profilePictureUrl: picture,
      createdAt: member.created_at,
    },
    consents,
    communities: (communities.data ?? []).map((c) => {
      const community = c.d1_communities as unknown as { id: string; name: string };
      return { id: community.id, name: community.name, role: c.role, joinedAt: c.joined_at };
    }),
    groups: (groups.data ?? []).map((g) => {
      const group = g.d1_groups as unknown as { id: string; name: string };
      return { id: group.id, name: group.name, role: g.role, joinedAt: g.joined_at, leftAt: g.left_at };
    }),
    messages: (messages.data ?? []).map((m) => ({
      id: m.id,
      groupId: m.group_id,
      body: m.body,
      createdAt: m.created_at,
      deletedAt: m.deleted_at,
    })),
    attachments: files.map((f) => ({
      id: f.id as string,
      groupId: f.group_id as string,
      mimeType: f.mime_type as string,
      sizeBytes: (f.size_bytes as number | null) ?? null,
      createdAt: f.created_at as string,
      url: urlFor.get(f.storage_path as string) ?? null,
    })),
    reactions: (reactions.data ?? []).map((r) => ({
      messageId: r.message_id as number,
      emoji: r.emoji as string,
      createdAt: r.created_at as string,
    })),
    blocked: (blocks.data ?? []).map((b) => {
      const person = b.blocked as unknown as { id: string; display_name: string };
      return { id: person.id, displayName: person.display_name, since: b.created_at as string };
    }),
    reports: (reports.data ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.created_at,
      status: r.status,
    })),
    feedback: (feedback.data ?? []).map((f) => ({
      id: f.id as string,
      kind: f.kind as D1FeedbackKind,
      body: f.body as string,
      createdAt: f.created_at as string,
      status: f.status as D1FeedbackStatus,
    })),
  };

  return oneJson(body);
});
