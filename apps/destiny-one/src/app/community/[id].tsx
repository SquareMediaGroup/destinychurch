// B2 Community — its groups (the ones I'm in) and Leave community.
// Leaders (canManage) get New group and Add people.

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1CommunitySummary } from "@destiny/shared";
import { orderedGroups } from "@/components/GroupRows";
import { invalidateCommunities, keys, prefetchGroup, useCommunity } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { Icon } from "@/components/Icon";
import { Avatar, Bone, Card, CardButton, ConfirmDialog, ErrorState, FloatingBack, LargeTitle, SecondaryButton, SkeletonGroup, SkeletonRows } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Community() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const community = useCommunity(id);
  const c = community.data;
  const error = community.error ? errorMessage(community.error) : null;
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => void community.refetch();

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      {c ? (
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 40, gap: 20 }}>
          <View style={{ paddingHorizontal: 4, gap: 6 }}>
            <LargeTitle>{c.name}</LargeTitle>
            {c.description ? <Text style={{ fontSize: 15, lineHeight: 21, color: t.muted }}>{c.description}</Text> : null}
          </View>

          {c.canManage ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <SecondaryButton label="New group" onPress={() => router.push({ pathname: "/new-group", params: { communityId: c.id } })} style={{ flex: 1, height: 46 }} />
            </View>
          ) : null}

          <Card>
            {orderedGroups(c).map((g) => (
              <Pressable key={g.id} onPressIn={() => prefetchGroup(g.id)} onPress={() => router.push(`/group/${g.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent" })}>
                <Avatar name={g.name} size={40} announcements={g.kind === "announcements"} />
                <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 17, color: t.text }}>
                      {g.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: t.muted }}>{g.state === "frozen" ? "Paused" : g.department ?? (g.kind === "announcements" ? "Community updates" : "Group")}</Text>
                  </View>
                  <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} />
                </View>
              </Pressable>
            ))}
          </Card>

          <CardButton label="Leave community" onPress={() => setLeaving(true)} />
        </ScrollView>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ErrorState message={error} onRetry={load} />
        </View>
      ) : (
        <SkeletonGroup label="Loading community" style={{ paddingTop: insets.top + 56, paddingHorizontal: 16, gap: 20 }}>
          <View style={{ paddingHorizontal: 4, gap: 10 }}>
            <Bone width="60%" height={32} radius={10} />
            <Bone width="85%" height={14} />
          </View>
          <SkeletonRows count={4} />
        </SkeletonGroup>
      )}
      <FloatingBack background={t.grouped} />

      <ConfirmDialog
        visible={leaving}
        title={`Leave ${c?.name ?? "community"}?`}
        body="You'll leave every group in this community."
        confirmLabel="Leave"
        busy={busy}
        onCancel={() => setLeaving(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api.leaveCommunity(id);
            setLeaving(false);
            router.dismissTo("/groups");
            queryClient.setQueryData<D1CommunitySummary[]>(keys.communities, (old) => old?.filter((x) => x.id !== id));
            invalidateCommunities();
          } catch (err) {
            setLeaving(false);
            Alert.alert("Couldn't leave the community", errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
