// Archived chats — from the Archived row at the top of Chats. Archiving hides a
// chat from your own list and silences it (mentions still reach you); it is
// per person and changes nothing for anyone else. Swipe, or open one, to bring
// it back.

import { FlatList, Text, View } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CardGroupRow, orderedGroups } from "@/components/GroupRows";
import { SwipeActions } from "@/components/Swipe";
import { Card, EmptyState, FloatingBack, LargeTitle, Separator } from "@/components/ui";
import { prefetchGroup, toggleChatArchive } from "@/lib/queries";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Archived() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { communities, assistant } = useSession();

  const sections = (communities ?? [])
    .map((c) => ({ community: c, groups: orderedGroups(c).filter((g) => g.archived) }))
    .filter((x) => x.groups.length > 0);
  const aiArchived = assistant?.archived ? assistant : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 40, gap: 18 }}
        data={sections}
        keyExtractor={(x) => x.community.id}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <LargeTitle style={{ paddingHorizontal: 4 }}>Archived</LargeTitle>
            {aiArchived ? (
              <Card shadow>
                <SwipeActions actions={[{ key: "archive", label: "Unarchive", icon: "archive", bg: "#5B6570", onPress: () => toggleChatArchive(aiArchived) }]} background={t.card}>
                  <Link href={`/group/${aiArchived.id}`} asChild>
                    <CardGroupRow group={aiArchived} onPressIn={() => prefetchGroup(aiArchived.id)} />
                  </Link>
                </SwipeActions>
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={aiArchived ? null : <EmptyState title="Nothing archived" body="Swipe a chat in Chats to archive it. Archived chats are silenced and tucked away here." />}
        ListFooterComponent={sections.length || aiArchived ? <Text style={{ fontSize: 13, lineHeight: 18, color: t.muted, paddingHorizontal: 4, paddingTop: 6 }}>Archived chats stay quiet. You&apos;ll still hear about @mentions.</Text> : null}
        renderItem={({ item: { community: c, groups } }) => (
          <View>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "600", color: t.muted, paddingHorizontal: 4, paddingBottom: 8 }}>{c.name}</Text>
            <Card shadow>
              {groups.map((g, i) => (
                <View key={g.id}>
                  {i > 0 ? <Separator inset={70} /> : null}
                  <SwipeActions actions={[{ key: "archive", label: "Unarchive", icon: "archive", bg: "#5B6570", onPress: () => toggleChatArchive(g) }]} background={t.card}>
                    <Link href={`/group/${g.id}`} asChild>
                      <CardGroupRow group={g} onPressIn={() => prefetchGroup(g.id)} />
                    </Link>
                  </SwipeActions>
                </View>
              ))}
            </Card>
          </View>
        )}
      />
      <FloatingBack background={t.bg} />
    </View>
  );
}
