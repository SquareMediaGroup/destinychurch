// Requests to join this group (leaders): each with the person's name and note,
// to approve or decline. Approving adds them to the group.

import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1JoinRequest } from "@destiny/shared";
import { Avatar, Card, EmptyState, ErrorState, FloatingBack, LargeTitle, PrimaryButton, Separator, TextButton } from "@/components/ui";
import { api } from "@/lib/api";
import { dayLabel } from "@/lib/format";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function JoinRequests() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useQuery({ queryKey: ["join-requests", id], queryFn: () => api.joinRequests(id), staleTime: 0 });
  const [busyId, setBusyId] = useState<number | null>(null);
  const items = list.data ?? [];

  async function decide(r: D1JoinRequest, approve: boolean) {
    setBusyId(r.id);
    try {
      await api.decideJoin(r.id, approve);
      // The group's member list and the count on Group info are stale now.
      void queryClient.invalidateQueries({ queryKey: keys.group(id) });
    } catch (err) {
      Alert.alert(approve ? "Couldn't add them" : "Couldn't decline", errorMessage(err));
    } finally {
      setBusyId(null);
      void list.refetch();
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ paddingHorizontal: 4 }}>
          <LargeTitle>Requests</LargeTitle>
        </View>
        {list.isError && !list.data ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : items.length === 0 && !list.isPending ? (
          <EmptyState title="No requests waiting" body="When someone asks to join from Discover groups, they show here." />
        ) : (
          <Card>
            {items.map((r, i) => (
              <View key={r.id}>
                {i > 0 ? <Separator inset={62} /> : null}
                <View style={{ padding: 16, gap: 10, opacity: busyId === r.id ? 0.5 : 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar name={r.member.displayName} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{r.member.displayName}</Text>
                      <Text style={{ fontSize: 13, color: t.muted }}>{dayLabel(r.createdAt)}</Text>
                    </View>
                  </View>
                  {r.note ? <Text style={{ fontSize: 16, lineHeight: 22, color: t.text }}>{r.note}</Text> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                    <PrimaryButton label="Add to group" onPress={() => void decide(r, true)} disabled={busyId !== null} style={{ flex: 1 }} />
                    <TextButton label="Decline" onPress={() => void decide(r, false)} color={t.muted} />
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
