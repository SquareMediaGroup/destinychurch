// Choose a ChurchSuite event to share into the chat. Picking one hands its
// ref back to the group screen (state/eventPick.ts), which sends it.

import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1EventSummary } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Card, EmptyState, ErrorState, Field, ModalHeader, SkeletonRows } from "@/components/ui";
import { api } from "@/lib/api";
import { eventWhen } from "@/lib/format";
import { eventPick } from "@/state/eventPick";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function EventPicker() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<D1EventSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = () => api.events().then(setEvents, (err) => setError(errorMessage(err)));
  useEffect(() => {
    void fetchEvents();
  }, []);
  const retry = () => {
    setError(null);
    setEvents(null);
    void fetchEvents();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !events) return events;
    return events.filter((e) => e.name.toLowerCase().includes(q));
  }, [events, query]);

  function choose(e: D1EventSummary) {
    eventPick.set(id, e);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="Choose an event" />
      <View style={{ paddingTop: 14, paddingBottom: 10 }}>
        <Field value={query} onChangeText={setQuery} placeholder="Search events" background={t.card} autoCapitalize="none" leading={<Icon name="search" size={16} color={t.subtle} />} />
      </View>
      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !filtered ? (
        <SkeletonRows count={5} avatar={44} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No events found" body={query ? "Try a different search." : "Nothing is on the calendar right now."} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.seriesKey}
          renderItem={({ item }) => <EventRow event={item} onPress={() => choose(item)} />}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

function EventRow({ event, onPress }: { event: D1EventSummary; onPress: () => void }) {
  const t = useTheme();
  return (
    <Card style={{ marginBottom: 10 }}>
      <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: pressed ? t.fill : "transparent" }]}>
        {event.thumbnailUrl ? (
          <Image source={{ uri: event.thumbnailUrl }} style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: t.fill }} resizeMode="cover" />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: t.avatar, alignItems: "center", justifyContent: "center" }}>
            <Icon name="calendar" size={22} color="#FFFFFF" strokeWidth={1.8} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: "600", color: t.text }}>
            {event.name}
          </Text>
          <Text style={{ fontSize: 13, color: t.muted }}>{eventWhen(event.startsAt)}</Text>
          {event.location ? (
            <Text numberOfLines={1} style={{ fontSize: 13, color: t.subtle }}>
              {event.location}
            </Text>
          ) : null}
        </View>
        <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} />
      </Pressable>
    </Card>
  );
}
