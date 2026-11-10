// Welcome checklist: a card at the top of Chats with four first steps. Every
// step ticks itself, so there is nothing to tap through. It shows for a
// member's first 14 days, goes once all four are done, and can be swiped away
// (it then never comes back). Progress is kept on the phone: see
// src/state/welcomeChecklist.ts.

import { useCallback, useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Notifications from "expo-notifications";
import { Icon } from "@/components/Icon";
import { SwipeActions } from "@/components/Swipe";
import { Card } from "@/components/ui";
import { useSession } from "@/state/session";
import { hideWelcome, useWelcomeProgress } from "@/state/welcomeChecklist";
import { useTheme } from "@/theme/tokens";

export function WelcomeChecklist() {
  const t = useTheme();
  const { me } = useSession();
  const progress = useWelcomeProgress(me?.id);
  // null until the system has answered, so the card never flashes a wrong count.
  const [notificationsOn, setNotificationsOn] = useState<boolean | null>(null);

  const checkNotifications = useCallback(() => {
    Notifications.getPermissionsAsync()
      .then((p) => setNotificationsOn(p.granted))
      .catch(() => setNotificationsOn(false));
  }, []);
  // Turning them on happens in Profile or in the system's settings, so look again on return.
  useFocusEffect(checkNotifications);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && checkNotifications());
    return () => sub.remove();
  }, [checkNotifications]);

  if (!me || !progress || notificationsOn === null) return null;
  if (progress.hidden || progress.expired) return null;

  const steps = [
    { key: "picture", label: "Add a profile picture", done: !!me.avatarUrl },
    { key: "notifications", label: "Turn on notifications", done: notificationsOn },
    { key: "group", label: "Open your first group chat", done: progress.openedGroup },
    { key: "safety", label: "Read \"How your chats are kept safe\"", done: progress.readSafety },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 4 }}>
      <Card shadow>
        <SwipeActions actions={[{ key: "hide", label: "Hide", icon: "close", bg: "#5B6570", onPress: () => hideWelcome(me.id) }]} background={t.card}>
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: t.text }}>Getting started</Text>
              <Text style={{ fontSize: 14, color: t.muted }}>{`${doneCount} of ${steps.length} done`}</Text>
            </View>
            {steps.map((s) => (
              <View key={s.key} accessible accessibilityLabel={`${s.label}, ${s.done ? "done" : "not done"}`} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: s.done ? t.tint : "transparent",
                    borderWidth: s.done ? 0 : 1.5,
                    borderColor: t.subtle,
                  }}
                >
                  {s.done ? <Icon name="check" size={13} color="#FFFFFF" strokeWidth={2.6} /> : null}
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: s.done ? t.muted : t.text }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </SwipeActions>
      </Card>
    </View>
  );
}
