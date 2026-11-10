// The messages waiting to go out in this group (leaders and admins). Tap one to
// change its time; Send now sends it straight away; Delete cancels it.

import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { D1ScheduledMessage } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Card, EmptyState, ErrorState, FloatingBack, LargeTitle, Separator, TextButton } from "@/components/ui";
import { api } from "@/lib/api";
import { formatUkTime } from "@/lib/format";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/tokens";

function summary(m: D1ScheduledMessage): string {
  if (m.poll) return `Poll: ${m.poll.question}`;
  if (m.body) return m.body;
  if (m.attachmentId) return "Photo";
  if (m.event) return "Event";
  return "Message";
}

export default function Scheduled() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useQuery({ queryKey: keys.scheduled(id), queryFn: () => api.scheduledMessages(id), staleTime: 0 });
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.scheduled(id) });

  async function sendNow(m: D1ScheduledMessage) {
    setBusyId(m.id);
    try {
      await api.sendScheduledNow(id, m.id);
    } catch (err) {
      Alert.alert("It wasn't sent", errorMessage(err));
    } finally {
      setBusyId(null);
      void refresh();
    }
  }

  function remove(m: D1ScheduledMessage) {
    Alert.alert("Delete this scheduled message?", "It won't be sent.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyId(m.id);
          try {
            await api.deleteScheduledMessage(id, m.id);
          } catch (err) {
            Alert.alert("Couldn't delete it", errorMessage(err));
          } finally {
            setBusyId(null);
            void refresh();
          }
        },
      },
    ]);
  }

  const items = list.data ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ paddingHorizontal: 4 }}>
          <LargeTitle>Scheduled</LargeTitle>
        </View>
        {list.isError && !list.data ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : items.length === 0 && !list.isPending ? (
          <EmptyState title="Nothing scheduled" body="Write a message, then hold Send and choose Schedule." />
        ) : (
          <Card>
            {items.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Separator /> : null}
                <View style={{ padding: 16, gap: 10, opacity: busyId === m.id ? 0.5 : 1 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${summary(m)}. Sends ${formatUkTime(m.runAt)}. Tap to change the time.`}
                    onPress={() => router.push({ pathname: "/group/[id]/schedule", params: { id, jobId: String(m.id) } })}
                    style={({ pressed }) => ({ gap: 6, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text numberOfLines={3} style={{ fontSize: 16, lineHeight: 22, color: t.text }}>{summary(m)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Icon name="clock" size={13} color={t.muted} />
                      <Text style={{ flex: 1, fontSize: 14, color: t.muted }}>{`${formatUkTime(m.runAt)} (UK time)${m.createdBy ? ` · ${m.createdBy.displayName}` : ""}`}</Text>
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: 24 }}>
                    <TextButton label="Send now" onPress={() => void sendNow(m)} />
                    <TextButton label="Delete" onPress={() => remove(m)} color={t.muted} />
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
