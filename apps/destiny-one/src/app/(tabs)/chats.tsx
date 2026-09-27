// B1 Chats — variant 1C "Compact": communities as sticky glass headers that
// collapse, one dense row per group with an unread dot.

import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1GroupSummary } from "@destiny/shared";
import { GlassSurface } from "@/components/GlassSurface";
import { CompactGroupRow, orderedGroups } from "@/components/GroupRows";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, LargeTitle } from "@/components/ui";
import { plural } from "@/lib/format";
import { useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function Chats() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { communities, communitiesError, refreshCommunities, isLeader } = useSession();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshCommunities();
    }, [refreshCommunities]),
  );

  const sections = useMemo(
    () =>
      (communities ?? []).map((c) => ({
        key: c.id,
        community: c,
        data: collapsed[c.id] ? [] : orderedGroups(c),
      })),
    [communities, collapsed],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCommunities();
    setRefreshing(false);
  };

  const header = (
    <View style={{ paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingHorizontal: 16 }}>
        <GlassSurface style={[{ height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 }, t.shadow]}>
          <HeaderIcon icon="search" label="Search" onPress={() => router.push("/search")} />
          {isLeader ? (
            <>
              <View style={{ width: StyleSheet.hairlineWidth, height: 20, backgroundColor: t.sep }} />
              <HeaderIcon icon="plus" label="New group" onPress={() => router.push("/new-group")} />
            </>
          ) : null}
        </GlassSurface>
      </View>
      <LargeTitle style={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 8 }}>Chats</LargeTitle>
      {communitiesError && communities ? <OfflineBanner /> : null}
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

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 120 }}
      sections={sections}
      keyExtractor={(g: D1GroupSummary) => g.id}
      stickySectionHeadersEnabled
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState title="No chats yet" body="You're not in any groups yet. Your team leader will add you." />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
      renderSectionHeader={({ section }) => {
        const c = section.community;
        const isCollapsed = !!collapsed[c.id];
        const unread = c.groups.reduce((n, g) => n + g.unreadCount, 0);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: !isCollapsed }}
            accessibilityLabel={`${c.name}, ${plural(c.groups.length, "group")}${isCollapsed && unread ? `, ${unread} unread` : ""}`}
            onPress={() => setCollapsed((s) => ({ ...s, [c.id]: !s[c.id] }))}
          >
            <GlassSurface style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 20, borderRadius: 0, borderWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: t.muted }}>{c.name}</Text>
              <Text style={{ fontSize: 13, color: t.subtle }}>· {plural(c.groups.length, "group")}</Text>
              <View style={{ flex: 1 }} />
              {isCollapsed && unread > 0 ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE }} /> : null}
              <View style={{ transform: [{ rotate: isCollapsed ? "-90deg" : "0deg" }] }}>
                <Icon name="chevronDown" size={13} color={t.subtle} strokeWidth={2.6} />
              </View>
            </GlassSurface>
          </Pressable>
        );
      }}
      renderItem={({ item }) => <CompactGroupRow group={item} onPress={() => router.push(`/group/${item.id}`)} />}
    />
  );
}

function HeaderIcon({ icon, label, onPress }: { icon: "search" | "plus"; label: string; onPress: () => void }) {
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

/** E6: chat list skeleton. */
function ListSkeleton() {
  const t = useTheme();
  return (
    <View accessibilityLabel="Loading chats" style={{ paddingTop: 12 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10, paddingLeft: 32, paddingRight: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ width: `${45 + ((i * 17) % 30)}%`, height: 14, borderRadius: 7, backgroundColor: t.fill }} />
            <View style={{ width: `${70 + ((i * 11) % 20)}%`, height: 12, borderRadius: 6, backgroundColor: t.fill }} />
          </View>
        </View>
      ))}
    </View>
  );
}
