// One church event as a card row: picture (or a calendar tile), name, when,
// where. Used by the composer's event picker and Upcoming events.

import { Image, Pressable, Text, View } from "react-native";
import type { D1EventSummary } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui";
import { eventWhen } from "@/lib/format";
import { useTheme } from "@/theme/tokens";

export function EventRow({ event, onPress, onLongPress }: { event: D1EventSummary; onPress: () => void; onLongPress?: () => void }) {
  const t = useTheme();
  return (
    <Card style={{ marginBottom: 10 }}>
      <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: pressed ? t.fill : "transparent" }]}>
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
