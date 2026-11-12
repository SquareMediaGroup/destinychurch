// Who tapped "I prayed" on a prayer request (tap the count on its card).

import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Card, ErrorState, FloatingBack, LargeTitle, Separator } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Prayed() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { messageId } = useLocalSearchParams<{ id: string; messageId: string }>();
  const who = useQuery({ queryKey: ["prayed", messageId], queryFn: () => api.prayedBy(Number(messageId)), staleTime: 0 });
  const people = who.data?.people ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ paddingHorizontal: 4 }}>
          <LargeTitle>Prayed</LargeTitle>
        </View>
        {who.isError ? (
          <ErrorState message={errorMessage(who.error)} onRetry={() => void who.refetch()} />
        ) : people.length ? (
          <Card>
            {people.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <Separator inset={62} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
                  <Avatar name={p.displayName} size={34} />
                  <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{p.displayName}</Text>
                </View>
              </View>
            ))}
          </Card>
        ) : who.isPending ? null : (
          <Text style={{ fontSize: 16, color: t.muted, paddingHorizontal: 4 }}>No one has tapped yet.</Text>
        )}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
