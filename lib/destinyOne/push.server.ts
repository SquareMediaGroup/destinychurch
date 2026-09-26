// Destiny One — push notifications through Expo's push service.
//
// CONTENT-FREE by design (docs/mobile-app-scope.md D4, B.3): the notification
// says "New message" and nothing else — no sender, no group name, no text.
// Expo, APNs and FCM are US-run processors; this way no message content and
// nothing about a minor passes through them, and nothing sensitive shows on a
// lock screen. The group id rides in `data` (an opaque uuid) so a tap can open
// the right group once the app has fetched it over our own API.
//
// Best-effort: called from `after()`, so a slow or failing push never delays
// or fails the message send.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

interface ExpoTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

export async function pushNewMessage(groupId: string, senderId: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

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
      await send(all.slice(i, i + CHUNK), groupId);
    }
  } catch (err) {
    console.error("⚠️ Destiny One push failed:", err);
  }
}

async function send(tokens: string[], groupId: string): Promise<void> {
  const messages = tokens.map((to) => ({
    to,
    title: "Destiny One",
    body: "New message",
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
