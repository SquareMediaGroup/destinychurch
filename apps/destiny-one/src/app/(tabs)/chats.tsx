// B1 Chats — variant 1B "Cards and filters": All / Unread / Announcements
// chips, then one card per community with "See all" to the community page.
//
// Press and hold a chat to peek at it (as in WhatsApp): the system context
// menu shows the conversation, read-only and without marking it read, with
// Mark as read / Mute / Group info underneath. Tapping the preview opens it.

import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/components/GlassSurface";
import { CardGroupRow, orderedGroups } from "@/components/GroupRows";
import { SwipeActions, type SwipeAction } from "@/components/Swipe";
import { Icon } from "@/components/Icon";
import { Appear, PressableScale, animateLayout } from "@/components/Motion";
import { Bone, Card, EmptyState, ErrorState, LargeTitle, Separator, SkeletonGroup } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { keys, prefetchGroup, updateGroupSummary } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import type { D1GroupSummary } from "@destiny/shared";
import { useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

type Filter = "all" | "unread" | "announcements";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "announcements", label: "Announcements" },
];

// Read and Mute apply at once and roll back if the server says no.
function markChatRead(g: D1GroupSummary) {
  const last = g.lastMessage;
  if (!last || g.unreadCount === 0) return;
  const was = g.unreadCount;
  updateGroupSummary(g.id, (x) => ({ ...x, unreadCount: 0 }));
  api.markRead(g.id, last.id).catch(() => updateGroupSummary(g.id, (x) => ({ ...x, unreadCount: was })));
}

function toggleChatMute(g: D1GroupSummary) {
  const until = g.muted ? null : "2999-12-31T00:00:00Z"; // "Always"; the fixed choices live in Notifications
  updateGroupSummary(g.id, (x) => ({ ...x, muted: until !== null }));
  api
    .mute(g.id, until)
    .then(() => queryClient.invalidateQueries({ queryKey: keys.group(g.id) }))
    .catch(() => updateGroupSummary(g.id, (x) => ({ ...x, muted: g.muted })));
}

/** Read and Mute for one chat row, as swipe actions. */
function rowActions(g: D1GroupSummary): SwipeAction[] {
  const actions: SwipeAction[] = [];
  if (g.unreadCount > 0 && g.lastMessage) actions.push({ key: "read", label: "Read", icon: "check", bg: "#0B62D6", onPress: () => markChatRead(g) });
  actions.push({ key: "mute", label: g.muted ? "Unmute" : "Mute", icon: g.muted ? "bell" : "bellOff", bg: "#363F48", onPress: () => toggleChatMute(g) });
  return actions;
}

/** A chat row that opens on tap and peeks on press and hold. */
function ChatRow({ group: g }: { group: D1GroupSummary }) {
  return (
    <Link href={`/group/${g.id}`} asChild>
      <Link.Trigger>
        <CardGroupRow group={g} onPressIn={() => prefetchGroup(g.id)} />
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        {g.unreadCount > 0 && g.lastMessage ? (
          <Link.MenuAction icon="checkmark.message" onPress={() => markChatRead(g)}>
            Mark as read
          </Link.MenuAction>
        ) : null}
        <Link.MenuAction icon={g.muted ? "bell" : "bell.slash"} onPress={() => toggleChatMute(g)}>
          {g.muted ? "Unmute" : "Mute"}
        </Link.MenuAction>
        <Link.MenuAction icon="info.circle" onPress={() => router.push(`/group/${g.id}/info`)}>
          Group info
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}

export default function Chats() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { communities, communitiesError, refreshCommunities, isLeader } = useSession();
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

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
    haptic.tick();
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
              <PressableScale
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                scaleTo={0.92}
                onPress={() => {
                  if (on) return;
                  haptic.selection();
                  animateLayout();
                  setFilter(f.key);
                }}
                style={{ minHeight: 34, borderRadius: 17, paddingHorizontal: 15, justifyContent: "center", backgroundColor: on ? t.text : t.fill }}
              >
                <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 15, fontWeight: "600", color: on ? t.bg : t.text }}>{f.label}</Text>
              </PressableScale>
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
      contentContainerStyle={{ paddingBottom: 110 }}
      data={cards}
      keyExtractor={(x) => x.community.id}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ORANGE} />}
      renderItem={({ item: { community: c, groups }, index }) => (
        // Cards cascade in the first time the list shows, then stay put.
        <Appear once={`chats:${c.id}`} delay={Math.min(index, 5) * 55} from={{ y: 22, scale: 0.98 }} style={{ paddingTop: 18, paddingHorizontal: 16 }}>
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
                <SwipeActions actions={rowActions(g)} background={t.card}>
                  <ChatRow group={g} />
                </SwipeActions>
              </View>
            ))}
          </Card>
        </Appear>
      )}
    />
  );
}

function HeaderIcon({ icon, label, onPress }: { icon: "plus"; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.85} style={({ pressed }) => ({ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={21} color={t.text} />
    </PressableScale>
  );
}

/** E1: shown above the list when the last refresh failed but we still have data. */
function OfflineBanner() {
  const t = useTheme();
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.fill }}>
      <Icon name="wifiOff" size={16} color={t.muted} />
      <Text style={{ flex: 1, fontSize: 13, color: t.muted }}>Can&apos;t connect. Showing your last update.</Text>
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
