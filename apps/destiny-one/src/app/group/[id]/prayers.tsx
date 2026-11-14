// A group's prayer requests, open and answered, newest first (Group info →
// Prayer). The same cards as in the chat; tapping one shows it there.

import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1Message } from "@destiny/shared";
import { Card, EmptyState, ErrorState, FloatingBack, LargeTitle, SectionLabel, TextButton } from "@/components/ui";
import { PrayerCard } from "@/components/MessageBubble";
import { api } from "@/lib/api";
import { dayLabel } from "@/lib/format";
import { keys } from "@/lib/queries";
import { jumpTo } from "@/state/jump";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Prayers() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useQuery({ queryKey: keys.prayers(id), queryFn: () => api.prayerRequests(id), staleTime: 0 });
  const all = (list.data ?? []).filter((m) => m.content?.kind === "prayer");
  const open = all.filter((m) => m.content?.kind === "prayer" && !m.content.prayer.answeredAt);
  const answered = all.filter((m) => m.content?.kind === "prayer" && !!m.content.prayer.answeredAt);

  const section = (title: string, items: D1Message[]) =>
    items.length ? (
      <View style={{ gap: 8 }}>
        <SectionLabel>{title}</SectionLabel>
        {items.map((m) =>
          m.content?.kind === "prayer" ? (
            <Card key={m.id} style={{ padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 13, color: t.muted }}>{`${m.mine ? "You" : m.sender?.displayName ?? "Former member"} · ${dayLabel(m.createdAt)}`}</Text>
              {/* Read-only here: praying and marking answered happen on the card in the chat. */}
              <PrayerCard content={m.content} mine={false} sending={false} canAct={false} onShowPrayed={() => router.push({ pathname: "/group/[id]/prayed", params: { id, messageId: String(m.id) } })} />
              <TextButton
                label="Show in chat"
                onPress={() => {
                  jumpTo.set(id, m.id);
                  router.dismissTo(`/group/${id}`);
                }}
              />
            </Card>
          ) : null,
        )}
      </View>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 20 }}>
        <View style={{ paddingHorizontal: 4 }}>
          <LargeTitle>Prayer</LargeTitle>
        </View>
        {list.isError && !list.data ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : all.length === 0 && !list.isPending ? (
          <EmptyState title="No prayer requests yet" body="In the chat, tap + and choose Prayer request." />
        ) : (
          <>
            {section("Open", open)}
            {section("Answered", answered)}
          </>
        )}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
