// Share a passage (or a sermon note) to one of your chats. It is sent as a
// normal message from you, so a reference in it arrives as a verse card, and it
// is covered by the usual reporting and retention.

import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_MESSAGE_LENGTH } from "@destiny/shared";
import { Avatar, Card, FloatingBack, LargeTitle, Lead, Separator } from "@/components/ui";
import { PressableScale } from "@/components/Motion";
import { api } from "@/lib/api";
import { noteText } from "@/state/notes";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function ShareVerse() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { label, note } = useLocalSearchParams<{ label?: string; note?: string }>();
  const { communities } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const groups = (communities ?? []).flatMap((c) => c.groups.filter((g) => g.state === "active" && !g.archived).map((g) => ({ g, c })));

  async function send(groupId: string, name: string) {
    const body = (note ? noteText(note) : label ?? "").slice(0, MAX_MESSAGE_LENGTH);
    if (!body.trim()) return;
    setBusy(groupId);
    try {
      await api.send(groupId, { body });
      router.back();
      Alert.alert("Shared", `Sent to ${name}.`);
    } catch (err) {
      Alert.alert("Couldn't share it", errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ paddingHorizontal: 4, gap: 6 }}>
          <LargeTitle>Share to a chat</LargeTitle>
          <Lead>{note ? "Your note is sent as a message from you." : `${label ?? "The passage"} is sent as a message from you.`}</Lead>
        </View>
        <Card>
          {groups.map(({ g, c }, i) => (
            <View key={g.id}>
              {i > 0 ? <Separator inset={70} /> : null}
              <PressableScale onPress={() => void send(g.id, g.name)} disabled={busy !== null} accessibilityRole="button" accessibilityLabel={`Send to ${g.name}`} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, opacity: busy && busy !== g.id ? 0.5 : 1 }}>
                <Avatar name={g.name} size={44} announcements={g.kind === "announcements"} uri={g.iconUrl} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{g.name}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 14, color: t.muted }}>{c.name}</Text>
                </View>
              </PressableScale>
            </View>
          ))}
        </Card>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
