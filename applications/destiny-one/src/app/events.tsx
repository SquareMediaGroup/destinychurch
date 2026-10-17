// Upcoming events, from the Search tab: the church calendar (ChurchSuite,
// the same feed as the website's What's On), soonest first, with a search.
// Tap an event for Share to a chat or View details.

import { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventRow } from "@/components/EventRow";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, Field, FloatingBack, LargeTitle, SkeletonRows } from "@/components/ui";
import { eventActions } from "@/lib/events";
import { useEvents } from "@/lib/queries";
import { errorMessage } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function Events() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { data: events, error, refetch, isRefetching } = useEvents();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!events) return null;
    const sorted = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return q ? sorted.filter((e) => [e.name, e.location ?? ""].some((s) => s.toLowerCase().includes(q))) : sorted;
  }, [events, query]);

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <FlatList
        data={filtered ?? []}
        keyExtractor={(e) => e.seriesKey}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={ORANGE} />}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 14 }}>
            <LargeTitle style={{ paddingHorizontal: 4 }}>Upcoming events</LargeTitle>
            <Field value={query} onChangeText={setQuery} placeholder="Search events" background={t.card} autoCapitalize="none" leading={<Icon name="search" size={16} color={t.subtle} />} />
          </View>
        }
        ListEmptyComponent={
          error && !events ? (
            <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
          ) : !filtered ? (
            <SkeletonRows count={5} avatar={44} />
          ) : (
            <EmptyState title="No events found" body={query ? "Try a different search." : "Nothing is on the calendar right now."} />
          )
        }
        renderItem={({ item }) => <EventRow event={item} onPress={() => eventActions(item)} />}
      />
      <FloatingBack background={t.grouped} />
    </View>
  );
}
