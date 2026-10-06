// Destiny One — push notifications through Expo's push service.
//
// The notification shows the group name as its title and "Sender: first line"
// as its body (decided 2026-09-27, replacing the earlier content-free "New
// message"). That means the sender's name and up to PUSH_PREVIEW_CHARS of text pass
// through Expo, APNs and FCM (US-run processors) and can show on a lock
// screen; the privacy notice and docs/destiny-one-gdpr.md must say so. Members
// can mute any group. The group id rides in `data` so a tap opens that group.
//
// @mentions: someone mentioned gets "Sender mentioned you: …" instead, and
// gets it even if they've muted the group (as in WhatsApp). Blocking still wins.
//
// Best-effort: called from `after()`, so a slow or failing push never delays
// or fails the message send.

import "server-only";
import { pushPreviewText, type PushPreview } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

interface ExpoTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

export async function pushNewMessage(groupId: string, senderId: string, preview: PushPreview, mentions: readonly string[] = [], messageId: number | null = null): Promise<void> {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const { data: group } = await supabase.from("d1_groups").select("name").eq("id", groupId).maybeSingle();
    const title = (group?.name as string | undefined) ?? "Destiny One";
    const body = pushPreviewText(preview);

    const { data: members } = await supabase
      .from("d1_group_members")
      .select("member_id, muted_until, d1_members!d1_group_members_member_id_fkey!inner(status)")
      .eq("group_id", groupId)
      .is("left_at", null)
      .neq("member_id", senderId)
      .eq("d1_members.status", "active");

    // Nobody is notified by someone they've blocked.
    const { data: blockers } = await supabase.from("d1_blocks").select("blocker_id").eq("blocked_id", senderId);
    const blockedBy = new Set((blockers ?? []).map((b) => b.blocker_id as string));

    const mentioned = new Set(mentions);
    const live = (members ?? []).map((m) => ({ id: m.member_id as string, muted: !!m.muted_until && m.muted_until >= now })).filter((m) => !blockedBy.has(m.id));
    const everyone = live.filter((m) => !m.muted && !mentioned.has(m.id)).map((m) => m.id);
    const named = live.filter((m) => mentioned.has(m.id)).map((m) => m.id);
    if (everyone.length === 0 && named.length === 0) return;

    const { data: tokens } = await supabase
      .from("d1_push_tokens")
      .select("token, member_id")
      .in("member_id", [...everyone, ...named]);
    const tokensFor = (ids: string[]) => (tokens ?? []).filter((t) => ids.includes(t.member_id as string)).map((t) => ({ token: t.token as string, memberId: t.member_id as string }));

    const batches: [{ token: string; memberId: string }[], string][] = [
      [tokensFor(everyone), body],
      [tokensFor(named), pushPreviewText({ ...preview, senderName: `${preview.senderName} mentioned you` })],
    ];
    for (const [list, text] of batches) {
      for (let i = 0; i < list.length; i += CHUNK) await send(list.slice(i, i + CHUNK), groupId, messageId, title, text);
    }
  } catch (err) {
    console.error("⚠️ Destiny One push failed:", err);
  }
}

/**
 * One batch to Expo. `categoryId: "message"` gives the notification its Reply
 * and Mark as read buttons (apps/destiny-one/src/lib/notificationActions.ts);
 * `memberId` says which account on the phone it's for, and `messageId` what
 * Mark as read marks.
 */
async function send(recipients: { token: string; memberId: string }[], groupId: string, messageId: number | null, title: string, body: string): Promise<void> {
  const tokens = recipients.map((r) => r.token);
  const messages = recipients.map((r) => ({
    to: r.token,
    title,
    body,
    sound: "default",
    channelId: "messages",
    categoryId: "message",
    data: { type: "message", groupId, messageId, memberId: r.memberId },
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(messages),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error(`⚠️ Expo push returned ${res.status}`);
    return;
  }

  // Tickets come back in the same order as the messages. A device that has
  // uninstalled the app is DeviceNotRegistered — drop its token.
  const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
  const dead = (json?.data ?? [])
    .map((ticket, i) => (ticket.details?.error === "DeviceNotRegistered" ? tokens[i] : null))
    .filter((t): t is string => t !== null);
  if (dead.length) {
    await createServiceClient().from("d1_push_tokens").delete().in("token", dead);
    console.log(`🧹 Removed ${dead.length} unregistered push token(s)`);
  }
}
