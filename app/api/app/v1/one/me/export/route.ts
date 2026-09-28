import type { D1Export } from "@destiny/shared";
import { isAdult } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { AVATAR_BUCKET, authenticate, loadConsents, loadMemberByAuthUser } from "@/lib/destinyOne/auth.server";
import { MEDIA_BUCKET } from "@/lib/destinyOne/chat.server";
import { OneError, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/me/export
//
// GDPR right of access: everything Destiny One holds about the caller, as
// JSON — profile (with email and profile picture), anything they sent with an
// access request, consents, memberships, their own messages (including ones
// they deleted, since we still hold those), the files they sent, reports they
// made and who they've blocked. Files come as download links valid for an
// hour. Other people's messages are not "their" data and are not included.

const LINK_TTL = 60 * 60;

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  const user = await authenticate(request);
  limit("export", user.id, 3);
  const member = await loadMemberByAuthUser(user.id);
  if (!member) throw new OneError("not_found", "We don't hold any Destiny One data for this account.");

  const supabase = createServiceClient();
  const [consents, communities, groups, messages, files, reports, blocks, extra] = await Promise.all([
    loadConsents(member.id),
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
      .select("id, group_id, body, attachment_id, created_at, deleted_at")
      .eq("sender_id", member.id)
      .order("id", { ascending: true }),
    supabase
      .from("d1_attachments")
      .select("id, group_id, storage_path, mime_type, size_bytes, created_at")
      .eq("uploader_id", member.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("d1_reports")
      .select("id, reason, created_at, status")
      .eq("reporter_id", member.id),
    supabase
      .from("d1_blocks")
      .select("created_at, blocked:d1_members!d1_blocks_blocked_id_fkey(display_name)")
      .eq("blocker_id", member.id),
    supabase
      .from("d1_members")
      .select("declared_adult_on, request_note, request_submitted_at")
      .eq("id", member.id)
      .single(),
  ]);

  const fileRows = files.data ?? [];
  const [fileLinks, avatarLink] = await Promise.all([
    fileRows.length
      ? supabase.storage.from(MEDIA_BUCKET).createSignedUrls(fileRows.map((f) => f.storage_path), LINK_TTL)
      : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    member.avatar_url ? supabase.storage.from(AVATAR_BUCKET).createSignedUrl(member.avatar_url, LINK_TTL) : Promise.resolve({ data: null }),
  ]);
  const linkFor = new Map((fileLinks.data ?? []).filter((l) => l.signedUrl).map((l) => [l.path, l.signedUrl]));
  const req = extra.data;

  const body: D1Export = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: member.id,
      displayName: member.display_name,
      email: user.email ?? null,
      status: member.status,
      roles: member.roles ?? [],
      isAdult: isAdult(member.adult_on),
      createdAt: member.created_at,
    },
    profilePicture: avatarLink.data?.signedUrl ?? null,
    accessRequest: req?.request_submitted_at
      ? { note: req.request_note, declaredAdultOn: req.declared_adult_on, submittedAt: req.request_submitted_at }
      : null,
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
      attachmentId: m.attachment_id,
      createdAt: m.created_at,
      deletedAt: m.deleted_at,
    })),
    files: fileRows.map((f) => ({
      id: f.id,
      groupId: f.group_id,
      mimeType: f.mime_type,
      sizeBytes: f.size_bytes,
      createdAt: f.created_at,
      downloadUrl: linkFor.get(f.storage_path) ?? null,
    })),
    reports: (reports.data ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.created_at,
      status: r.status,
    })),
    blocked: (blocks.data ?? []).map((b) => ({
      displayName: (b.blocked as unknown as { display_name: string } | null)?.display_name ?? "Former member",
      blockedAt: b.created_at,
    })),
  };

  return oneJson(body);
});
