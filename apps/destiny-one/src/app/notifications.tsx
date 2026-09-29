// D2 Notifications — the master switch (system permission) and mutes.
// ?groupId=… shows that group's mute options at the top (from Group info).

import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, FloatingBack, LargeTitle, PickRow, SectionLabel } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { registerForPush } from "@/lib/push";
import { keys, updateGroupSummary } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage, useGroupSummary, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

const MUTES = [
  { label: "Off", hours: 0 },
  { label: "8 hours", hours: 8 },
  { label: "1 week", hours: 24 * 7 },
  { label: "Always", hours: Infinity },
] as const;
type MuteLabel = (typeof MUTES)[number]["label"];

function untilFor(hours: number): string | null {
  if (hours === 0) return null;
  if (hours === Infinity) return "2999-12-31T00:00:00Z";
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export default function NotificationSettings() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { communities } = useSession();
  const focus = useGroupSummary(groupId);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  // The choice belongs to the group it was made for, so it resets when groupId changes.
  const [choice, setChoice] = useState<{ groupId?: string; label: MuteLabel | null }>({ groupId, label: null });
  const chosen = choice.groupId === groupId ? choice.label : null;
  const setChosen = (label: MuteLabel | null) => setChoice({ groupId, label });

  const checkPermission = useCallback(() => {
    Notifications.getPermissionsAsync().then((p) => setAllowed(p.granted), () => setAllowed(false));
  }, []);
  useFocusEffect(checkPermission);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && checkPermission());
    return () => sub.remove();
  }, [checkPermission]);

  async function toggle(on: boolean) {
    if (on) {
      const res = await registerForPush().catch(() => "denied" as const);
      if (res !== "registered") void Linking.openSettings();
    } else {
      void Linking.openSettings();
    }
    checkPermission();
  }

  async function mute(label: MuteLabel) {
    if (!groupId) return;
    const prev = chosen;
    setChosen(label);
    try {
      const until = untilFor(MUTES.find((m) => m.label === label)!.hours);
      await api.mute(groupId, until);
      updateGroupSummary(groupId, (g) => ({ ...g, muted: until !== null }));
      void queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
    } catch (err) {
      setChosen(prev);
      Alert.alert("Couldn't change the mute", errorMessage(err));
    }
  }

  const current: MuteLabel | null = chosen ?? (focus ? (focus.group.muted ? null : "Off") : null);

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 40, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>Notifications</LargeTitle>

        <View style={{ gap: 8 }}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ flex: 1, fontSize: 17, color: t.text }}>Allow notifications</Text>
            <Switch value={!!allowed} onValueChange={toggle} trackColor={{ true: ORANGE, false: t.fill2 }} accessibilityLabel="Allow notifications" />
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            Message previews show the sender and first line. Announcements always notify unless muted.
          </Text>
        </View>

        {focus ? (
          <View style={{ gap: 8 }}>
            <SectionLabel>Mute {focus.group.name}</SectionLabel>
            <Card>
              {MUTES.map((m, i) => (
                <View key={m.label}>
                  {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} /> : null}
                  <PickRow label={m.label} on={current === m.label} onPress={() => void mute(m.label)} />
                </View>
              ))}
            </Card>
            {focus.group.muted && !chosen ? <Text style={{ paddingHorizontal: 16, fontSize: 13, color: t.subtle }}>This group is muted.</Text> : null}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <SectionLabel>All groups</SectionLabel>
          <Card>
            {(communities ?? []).flatMap((c) =>
              c.groups.map((g) => (
                <Pressable key={g.id} onPress={() => router.setParams({ groupId: g.id })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent" })}>
                  <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
                    <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 17, color: t.text }}>
                        {g.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: t.subtle }}>{c.name}</Text>
                    </View>
                    <Text style={{ fontSize: 15, color: t.muted }}>{g.muted ? "Muted" : "On"}</Text>
                    <Icon name="chevronRight" size={12} color={t.subtle} strokeWidth={2.6} />
                  </View>
                </Pressable>
              )),
            )}
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, color: t.subtle }}>Tap a group to mute it.</Text>
        </View>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
