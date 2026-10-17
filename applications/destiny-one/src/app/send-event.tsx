// Share an event to a chat, from Upcoming events: pick one chat you can post
// in and the event card is sent there (the server re-fetches and snapshots
// it, as for the composer's Event button), then that chat opens.
//
// Params: seriesKey, slug, name.

import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Avatar, Card, EmptyState, FormError, SectionLabel } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function SendEvent() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { seriesKey, slug, name } = useLocalSearchParams<{ seriesKey: string; slug: string; name: string }>();
  const { communities } = useSession();
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const targets = (communities ?? []).flatMap((c) =>
    c.groups.filter((g) => g.state === "active" && (g.kind !== "announcements" || g.myRole === "admin")).map((g) => ({ g, community: c.name })),
  );

  async function send(groupId: string) {
    if (sending) return;
    setSending(groupId);
    setError(null);
    try {
      await api.send(groupId, { event: { seriesKey, slug } });
      haptic.success();
      void queryClient.invalidateQueries({ queryKey: keys.messages(groupId) });
      router.back();
      router.push(`/group/${groupId}`);
    } catch (err) {
      haptic.error();
      setError(errorMessage(err, "Couldn't share the event. Try again."));
    } finally {
      setSending(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16 }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
          <Text style={{ fontSize: 17, color: t.tint }}>Cancel</Text>
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: t.text, marginRight: 50 }}>
          Share {name ?? "event"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 30, gap: 12 }}>
        <FormError message={error} live />
        {targets.length === 0 ? (
          <EmptyState title="No chats to post in" body="You're not in any group you can post in yet." />
        ) : (
          <View style={{ gap: 7 }}>
            <SectionLabel>Send to</SectionLabel>
            <Card>
              {targets.map(({ g, community }, i) => (
                <Pressable
                  key={g.id}
                  disabled={!!sending}
                  onPress={() => void send(g.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Send to ${g.name}`}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent", opacity: sending && sending !== g.id ? 0.5 : 1 })}
                >
                  <Avatar name={g.name} size={36} announcements={g.kind === "announcements"} uri={g.iconUrl} />
                  <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingRight: 16, borderBottomWidth: i < targets.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: t.sep }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontSize: 17, color: t.text }}>{g.name}</Text>
                      <Text numberOfLines={1} style={{ fontSize: 13, color: t.muted }}>{community}</Text>
                    </View>
                    {sending === g.id ? <ActivityIndicator color={ORANGE} /> : <Icon name="send" size={16} color={t.subtle} strokeWidth={2.4} />}
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
