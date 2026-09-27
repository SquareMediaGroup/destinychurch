// Destiny One — push notifications through Expo's push service.
//
// The notification shows the group name as its title and "Sender: first line"
// as its body (decided 2026-09-27, replacing the earlier content-free "New
// message"). That means the sender's name and up to PUSH_PREVIEW_CHARS of text pass
// through Expo, APNs and FCM (US-run processors) and can show on a lock
// screen; the privacy notice and docs/destiny-one-gdpr.md must say so. Members
// can mute any group. The group id rides in `data` so a tap opens that group.
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

export async function pushNewMessage(groupId: string, senderId: string, preview: PushPreview): Promise<void> {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    const { data: group } = await supabase.from("d1_groups").select("name").eq("id", groupId).maybeSingle();
    const title = (group?.name as string | undefined) ?? "Destiny One";
    const body = pushPreviewText(preview);

    const { data: members } = await supabase
      .from("d1_group_members")
      .select("member_id, muted_until, d1_members!inner(status)")
      .eq("group_id", groupId)
      .is("left_at", null)
      .neq("member_id", senderId)
      .eq("d1_members.status", "active");

    const recipients = (members ?? [])
      .filter((m) => !m.muted_until || m.muted_until < now)
      .map((m) => m.member_id as string);
    if (recipients.length === 0) return;

    const { data: tokens } = await supabase
      .from("d1_push_tokens")
      .select("token")
      .in("member_id", recipients);
    const all = (tokens ?? []).map((t) => t.token as string);

    for (let i = 0; i < all.length; i += CHUNK) {
      await send(all.slice(i, i + CHUNK), groupId, title, body);
    }
  } catch (err) {
    console.error("⚠️ Destiny One push failed:", err);
  }
}

async function send(tokens: string[], groupId: string, title: string, body: string): Promise<void> {
  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    channelId: "messages",
    data: { type: "message", groupId },
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
