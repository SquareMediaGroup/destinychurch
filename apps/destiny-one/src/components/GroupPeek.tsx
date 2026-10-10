// What a press and hold on a chat row shows (the Link.Preview in the chats
// list). It reads the cached conversation and draws plain bubbles: the real
// chat screen (live conversation hook, composer, voice and sermon players)
// would otherwise be built from scratch on every peek.

import { useMemo } from "react";
import { Text, View } from "react-native";
import type { D1Message } from "@destiny/shared";
import { Avatar } from "@/components/ui";
import { useGroup, useMessages } from "@/lib/queries";
import { useGroupSummary } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const SHOWN = 14;

/** One line standing in for whatever the message carries. */
function summarise(m: D1Message): string {
  if (m.deleted) return "This message was deleted";
  if (m.body) return m.body;
  if (m.attachment) return "Attachment";
  if (m.content) return "Poll or event";
  return "";
}

export function GroupPeek({ id }: { id: string }) {
  const t = useTheme();
  const summary = useGroupSummary(id);
  const group = useGroup(id).data;
  const messages = useMessages(id).data?.messages;
  const name = group?.name ?? summary?.group.name ?? "";
  const recent = useMemo(() => (messages ?? []).slice(-SHOWN), [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: t.sep }}>
        <Avatar name={name} size={32} assistant={(group?.kind ?? summary?.group.kind) === "assistant"} uri={group?.iconUrl ?? summary?.group.iconUrl} />
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: "600", color: t.text }}>
          {name}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 12, gap: 6 }}>
        {recent.map((m) => (
          <View
            key={m.id}
            style={{
              alignSelf: m.mine ? "flex-end" : "flex-start",
              maxWidth: "80%",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 16,
              backgroundColor: m.mine ? t.send : t.bubbleIn,
            }}
          >
            {!m.mine && m.sender ? (
              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: t.subtle, marginBottom: 1 }}>
                {m.sender.displayName}
              </Text>
            ) : null}
            <Text numberOfLines={4} style={{ fontSize: 15, color: m.mine ? t.onSend : t.text }}>
              {summarise(m)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
