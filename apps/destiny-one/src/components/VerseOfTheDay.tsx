// A small card at the top of Chats with YouVersion's verse of the day (their
// pick; we can't choose it), in the church's Bible. Tap it to read the whole
// passage or share it to a chat. Hidden in Appearance, or when it can't be
// loaded (it's a nicety: no error is shown).

import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";
import { useVerseOfDayHidden } from "@/state/verseOfDay";
import { useTheme } from "@/theme/tokens";

/** Today in the UK, so the card refetches once the day turns over. */
function ukDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function VerseOfTheDay() {
  const t = useTheme();
  const hidden = useVerseOfDayHidden();
  const votd = useQuery({ queryKey: ["votd", ukDate()], queryFn: () => api.verseOfTheDay(), enabled: !hidden, staleTime: 3_600_000, retry: 1 });
  if (hidden || !votd.data) return null;
  const v = votd.data;

  return (
    <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 4 }}>
      <Card shadow>
        <Pressable
          onPress={() => router.push({ pathname: "/passage", params: { id: v.passageId, bible: String(v.bibleId), votd: "1" } })}
          accessibilityRole="button"
          accessibilityLabel={`Verse of the day, ${v.reference}. Opens the passage.`}
          style={({ pressed }) => ({ padding: 16, gap: 6, opacity: pressed ? 0.7 : 1 })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="doc" size={14} color={t.tint} strokeWidth={2.2} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.tint }}>Verse of the day</Text>
          </View>
          <Text numberOfLines={3} style={{ fontSize: 16, lineHeight: 22, color: t.text }}>{v.text}</Text>
          <Text style={{ fontSize: 13, color: t.muted }}>{[v.reference, v.abbreviation].filter(Boolean).join(" · ")}</Text>
        </Pressable>
      </Card>
    </View>
  );
}
