// Discover groups: small groups open to new people, in the communities you are
// in. Ask to join with an optional note; a leader approves. Under-18s only see
// groups a safeguarding admin has marked suitable (the server decides, not this
// screen). Filter by the day a group meets, and by community when there are
// several.

import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WEEKDAYS, meetingDayLabel, type D1DiscoverGroup } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, Card, EmptyState, ErrorState, FloatingBack, LargeTitle, Lead, Separator } from "@/components/ui";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const KEY = ["discover"] as const;

export default function Discover() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const list = useQuery({ queryKey: KEY, queryFn: () => api.discoverGroups(), staleTime: 0 });
  const [day, setDay] = useState<number | null>(null);
  const [community, setCommunity] = useState<string | null>(null);
  const all = useMemo(() => list.data ?? [], [list.data]);
  const communities = useMemo(() => [...new Map(all.map((g) => [g.communityId, g.communityName])).entries()], [all]);
  const days = useMemo(() => [...new Set(all.map((g) => g.meetingDay).filter((d): d is number => d !== null))].sort(), [all]);
  const shown = all.filter((g) => (day === null || g.meetingDay === day) && (community === null || g.communityId === community));

  async function withdraw(g: D1DiscoverGroup) {
    try {
      await api.withdrawJoin(g.groupId);
    } catch (err) {
      Alert.alert("Couldn't cancel the request", errorMessage(err));
    }
    void queryClient.invalidateQueries({ queryKey: KEY });
  }

  const chip = (label: string, on: boolean, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={{ minHeight: 34, borderRadius: 17, paddingHorizontal: 14, justifyContent: "center", backgroundColor: on ? t.text : t.fill }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: on ? t.bg : t.text }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ paddingHorizontal: 20, gap: 6 }}>
          <LargeTitle>Discover groups</LargeTitle>
          <Lead>Groups open to new people. Ask to join and a leader will answer.</Lead>
        </View>

        {days.length > 0 || communities.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {communities.length > 1 ? communities.map(([id, name]) => chip(name, community === id, () => setCommunity(community === id ? null : id))) : null}
            {days.map((d) => chip(`${WEEKDAYS[d - 1]}s`, day === d, () => setDay(day === d ? null : d)))}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: 16 }}>
          {list.isError && !list.data ? (
            <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          ) : shown.length === 0 && !list.isPending ? (
            <EmptyState title={all.length === 0 ? "No groups to join right now" : "No groups match"} body={all.length === 0 ? "When a leader opens a group to new people, it will show here." : "Try another day."} />
          ) : (
            <Card>
              {shown.map((g, i) => (
                <View key={g.groupId}>
                  {i > 0 ? <Separator inset={70} /> : null}
                  <View style={{ flexDirection: "row", gap: 12, padding: 14 }}>
                    <Avatar name={g.name} size={44} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{g.name}</Text>
                      <Text style={{ fontSize: 14, color: t.muted }}>{[g.communityName, meetingDayLabel(g.meetingDay), g.meetingArea, plural(g.memberCount, "member")].filter(Boolean).join(" · ")}</Text>
                      {g.blurb ? <Text style={{ fontSize: 15, lineHeight: 20, color: t.text }}>{g.blurb}</Text> : null}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 6 }}>
                        {g.requestId !== null ? (
                          <>
                            <Text style={{ fontSize: 15, fontWeight: "600", color: t.muted }}>Requested</Text>
                            <Text accessibilityRole="button" onPress={() => void withdraw(g)} style={{ fontSize: 15, color: t.tint }}>Cancel</Text>
                          </>
                        ) : g.declinedUntil ? (
                          <Text style={{ fontSize: 14, color: t.muted }}>{`You can ask again after ${new Date(g.declinedUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}</Text>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Ask to join ${g.name}`}
                            onPress={() => router.push({ pathname: "/join-request", params: { groupId: g.groupId, name: g.name } })}
                            style={{ minHeight: 36, borderRadius: 18, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.tint }}
                          >
                            <Icon name="addPerson" size={15} color="#FFFFFF" strokeWidth={2.2} />
                            <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFFFFF" }}>Ask to join</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
