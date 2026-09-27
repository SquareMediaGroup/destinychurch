// B1 Chats — variant 1B "Cards and filters": All / Unread / Announcements
// chips, then one card per community with "See all" to the community page.

import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/components/GlassSurface";
import { CardGroupRow, orderedGroups } from "@/components/GroupRows";
import { Icon } from "@/components/Icon";
import { Bone, Card, EmptyState, ErrorState, LargeTitle, Separator, SkeletonGroup } from "@/components/ui";
import { useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

type Filter = "all" | "unread" | "announcements";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "announcements", label: "Announcements" },
];

export default function Chats() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { communities, communitiesError, refreshCommunities, isLeader } = useSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshCommunities();
    }, [refreshCommunities]),
  );

  // A community with nothing left after filtering shows no card.
  const cards = useMemo(
    () =>
      (communities ?? [])
        .map((c) => ({
          community: c,
          groups: orderedGroups(c).filter((g) => (filter === "unread" ? g.unreadCount > 0 : filter === "announcements" ? g.kind === "announcements" : true)),
        }))
        .filter((x) => x.groups.length > 0),
    [communities, filter],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCommunities();
    setRefreshing(false);
  };

  const header = (
    <View style={{ paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 16 }}>
        {isLeader ? (
          <GlassSurface style={[{ height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 }, t.shadow]}>
            <HeaderIcon icon="plus" label="New group" onPress={() => router.push("/new-group")} />
          </GlassSurface>
        ) : null}
      </View>
      <LargeTitle style={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 8 }}>Chats</LargeTitle>
      {communitiesError && communities ? <OfflineBanner /> : null}
      {communities && communities.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 6, paddingHorizontal: 16, paddingBottom: 4, gap: 8 }}>
          {FILTERS.map((f) => {
            const on = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f.key)}
                style={{ height: 34, borderRadius: 17, paddingHorizontal: 15, justifyContent: "center", backgroundColor: on ? t.text : t.fill }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: on ? t.bg : t.text }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  if (!communities) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {header}
        {communitiesError ? <ErrorState message={communitiesError} onRetry={() => void refreshCommunities()} /> : <ListSkeleton />}
      </View>
    );
  }

  const empty =
    communities.length === 0 ? (
      <EmptyState title="No chats yet" body="You're not in any groups yet. Your team leader will add you." />
    ) : (
      <EmptyState title={filter === "unread" ? "All caught up" : "No announcements"} body={filter === "unread" ? "You've read everything." : "None of your communities have announcements."} />
    );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
      data={cards}
      keyExtractor={(x) => x.community.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
      renderItem={({ item: { community: c, groups } }) => (
        <View style={{ paddingTop: 18, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 8 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: "600", color: t.muted }}>{c.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`See all in ${c.name}`} onPress={() => router.push(`/community/${c.id}`)} hitSlop={8}>
              <Text style={{ fontSize: 15, color: t.tint }}>See all</Text>
            </Pressable>
          </View>
          <Card shadow>
            {groups.map((g, i) => (
              <View key={g.id}>
                {i > 0 ? <Separator inset={70} /> : null}
                <CardGroupRow group={g} onPress={() => router.push(`/group/${g.id}`)} />
              </View>
            ))}
          </Card>
        </View>
      )}
    />
  );
}

function HeaderIcon({ icon, label, onPress }: { icon: "plus"; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
      <Icon name={icon} size={21} color={t.text} />
    </Pressable>
  );
}

/** E1: shown above the list when the last refresh failed but we still have data. */
function OfflineBanner() {
  const t = useTheme();
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.fill }}>
      <Icon name="wifiOff" size={16} color={t.muted} />
      <Text style={{ flex: 1, fontSize: 13, color: t.muted }}>Can't connect. Showing your last update.</Text>
    </View>
  );
}

/** E6: chat list skeleton, shaped like the community cards. */
function ListSkeleton() {
  return (
    <SkeletonGroup label="Loading chats" style={{ paddingTop: 18, paddingHorizontal: 16, gap: 18 }}>
      {[3, 2].map((rows, c) => (
        <View key={c} style={{ gap: 8 }}>
          <Bone width={120} height={14} style={{ marginLeft: 4 }} />
          <Card>
            {Array.from({ length: rows }, (_, i) => (
              <View key={i}>
                {i > 0 ? <Separator inset={70} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 14, paddingVertical: 12 }}>
                  <Bone width={44} height={44} radius={14} />
                  <View style={{ flex: 1, gap: 8, paddingRight: 14 }}>
                    <Bone width={`${45 + ((i * 17 + c * 9) % 30)}%`} height={14} />
                    <Bone width={`${70 + ((i * 11) % 20)}%`} height={12} />
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </SkeletonGroup>
  );
}
