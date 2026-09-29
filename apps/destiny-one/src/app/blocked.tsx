// Blocked people — from Settings. Blocking hides someone's messages and
// notifications for you only; you both stay in your groups, and the
// safeguarding team can still see everything. Unblock brings their messages
// back.

import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Card, EmptyState, FloatingBack, LargeTitle } from "@/components/ui";
import { api } from "@/lib/api";
import { showSendersAgain } from "@/lib/queries";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Blocked() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { me, setMe } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const blocked = me?.blocked ?? [];

  async function unblock(id: string, name: string) {
    setBusy(id);
    try {
      setMe(await api.unblock(id));
      showSendersAgain();
    } catch (err) {
      Alert.alert(`Couldn't unblock ${name}`, errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 40, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>Blocked people</LargeTitle>
        {blocked.length === 0 ? (
          <EmptyState title="No one blocked" body="To block someone, press and hold one of their messages." />
        ) : (
          <View style={{ gap: 8 }}>
            <Card>
              {blocked.map((b) => (
                <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16 }}>
                  <Avatar name={b.displayName} size={38} />
                  <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, color: t.text }}>
                      {b.displayName}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Unblock ${b.displayName}`}
                      disabled={busy === b.id}
                      onPress={() => void unblock(b.id, b.displayName)}
                      style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: pressed ? t.fill2 : t.fill, opacity: busy === b.id ? 0.5 : 1 })}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "600", color: t.tint }}>Unblock</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}
        <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
          You won&apos;t see messages from people you block, and they won&apos;t notify you. You both stay in your groups. The safeguarding team can still see everything.
        </Text>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
