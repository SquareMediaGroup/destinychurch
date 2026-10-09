// Forward, from the message menu: pick up to 5 other chats you can post in,
// then Send. Each gets a copy marked "Forwarded", sent by you (who wrote the
// original isn't carried across). Polls can't be forwarded; the menu doesn't
// offer it for them.
//
// Params: groupId (where the message is), messageId.

import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Avatar, Card, EmptyState, FormError, PrimaryButton, SectionLabel } from "@/components/ui";
import { api } from "@/lib/api";
import { messageSummary } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { keys, useMessages } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

const MAX_TARGETS = 5;

export default function Forward() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, messageId } = useLocalSearchParams<{ groupId: string; messageId: string }>();
  const { communities } = useSession();
  const message = useMessages(groupId).data?.messages.find((m) => m.id === Number(messageId)) ?? null;
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Every other chat I can post in, by community.
  const targets = (communities ?? []).flatMap((c) =>
    c.groups.filter((g) => g.id !== groupId && g.state === "active" && (g.kind !== "announcements" || g.myRole === "admin")).map((g) => ({ g, community: c.name })),
  );

  function toggle(id: string) {
    haptic.selection();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_TARGETS ? p : [...p, id]));
  }

  async function send() {
    if (!picked.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.forward(Number(messageId), picked);
      haptic.success();
      for (const id of picked) void queryClient.invalidateQueries({ queryKey: keys.messages(id) });
      router.back();
      if (picked.length === 1) router.push(`/group/${picked[0]}`);
    } catch (err) {
      haptic.error();
      setError(errorMessage(err, "Couldn't forward that. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16 }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
          <Text style={{ fontSize: 17, color: t.tint }}>Cancel</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: t.text, marginRight: 50 }}>Forward</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: 20 }}>
        {message ? (
          <Card style={{ padding: 14 }}>
            <Text numberOfLines={3} style={{ fontSize: 15, lineHeight: 20, color: t.text }}>
              {messageSummary(message)}
            </Text>
          </Card>
        ) : null}
        {targets.length === 0 ? (
          <EmptyState title="Nowhere to forward to" body="You're not in another chat you can post in." />
        ) : (
          <View style={{ gap: 7 }}>
            <SectionLabel>{`Choose up to ${MAX_TARGETS} chats`}</SectionLabel>
            <Card>
              {targets.map(({ g, community }, i) => {
                const on = picked.includes(g.id);
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => toggle(g.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${g.name}, ${community}`}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent" })}
                  >
                    <Avatar name={g.name} size={36} announcements={g.kind === "announcements"} uri={g.iconUrl} />
                    <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingRight: 16, borderBottomWidth: i < targets.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: t.sep }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ fontSize: 17, color: t.text }}>{g.name}</Text>
                        <Text numberOfLines={1} style={{ fontSize: 13, color: t.muted }}>{community}</Text>
                      </View>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 0 : 1.5, borderColor: t.subtle, backgroundColor: on ? ORANGE : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {on ? <Icon name="check" size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        )}
      </ScrollView>
      <View style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 16), gap: 8 }}>
        <FormError message={error} live />
        {busy ? <ActivityIndicator color={ORANGE} /> : <PrimaryButton label={picked.length > 1 ? `Send to ${picked.length} chats` : "Send"} onPress={() => void send()} disabled={!picked.length} />}
      </View>
    </View>
  );
}
