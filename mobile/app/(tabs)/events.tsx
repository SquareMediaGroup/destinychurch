import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type DeduplicatedEvent,
  churchSuiteEventUrl,
} from "@destiny/shared";
import { theme } from "@/theme";

// The app talks only to the BFF (never ChurchSuite directly). Point this at the
// deployed site by default; override with EXPO_PUBLIC_API_BASE_URL in dev.
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://destinytees.uk";

type LoadState = "loading" | "ready" | "error";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export default function EventsScreen() {
  const [events, setEvents] = useState<DeduplicatedEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/app/events`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { events: DeduplicatedEvent[] };
      setEvents(data.events ?? []);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>What&apos;s On</Text>
      </View>

      {state === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : state === "error" ? (
        <View style={styles.center}>
          <Text style={styles.muted}>
            Events are temporarily unavailable. Pull down to try again.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No upcoming events right now.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => Linking.openURL(churchSuiteEventUrl(item.identifier))}
            >
              <View style={styles.accentBar} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.cardMeta}>
                  {formatDate(item.datetime_start)}
                  {item.sessionCount > 1 ? `  ·  ${item.sessionCount} sessions` : ""}
                </Text>
                {item.location?.name ? (
                  <Text style={styles.cardMeta}>{item.location.name}</Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing(6), paddingBottom: theme.spacing(2) },
  title: {
    fontFamily: theme.fonts.bodyBlack,
    color: theme.colors.text,
    fontSize: 28,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing(8) },
  muted: {
    fontFamily: theme.fonts.body,
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
  },
  list: { paddingHorizontal: theme.spacing(6), paddingBottom: theme.spacing(10), gap: theme.spacing(3) },
  card: {
    flexDirection: "row",
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  accentBar: { width: 5, backgroundColor: theme.colors.accent },
  cardBody: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(1) },
  cardTitle: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.text,
    fontSize: 16,
  },
  cardMeta: {
    fontFamily: theme.fonts.body,
    color: theme.colors.textMuted,
    fontSize: 13,
  },
});
