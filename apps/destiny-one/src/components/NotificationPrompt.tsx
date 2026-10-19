// A10 Notifications explainer — asked in context, the first time someone
// opens a group. Never on first launch. Asked once per device, and only while
// the system can still ask: not when notifications are already on (say, from
// Profile → Notifications), nor once they've been refused for good.

import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { PrimaryButton } from "@/components/ui";
import { registerForPush } from "@/lib/push";
import { INK, ORANGE, useTheme } from "@/theme/tokens";

export const ASKED_KEY = "d1.notifAsked";

export function NotificationPrompt({ enabled }: { enabled: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    Promise.all([SecureStore.getItemAsync(ASKED_KEY), Notifications.getPermissionsAsync()])
      .then(([asked, permission]) => {
        if (!asked && !permission.granted && permission.canAskAgain) timer = setTimeout(() => setVisible(true), 900);
      })
      .catch(() => undefined);
    return () => clearTimeout(timer);
  }, [enabled]);

  const close = () => {
    setVisible(false);
    void SecureStore.setItemAsync(ASKED_KEY, "1").catch(() => undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable accessibilityLabel="Not now" onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} />
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 8, paddingBottom: Math.max(insets.bottom, 8) }} pointerEvents="box-none">
        <View style={[{ borderRadius: 46, backgroundColor: t.sheet, paddingTop: 10, paddingHorizontal: 22, paddingBottom: 26, alignItems: "center", gap: 16 }, t.shadow]}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.fill2 }} />
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
            <Icon name="bell" size={30} color={INK} strokeWidth={1.9} />
          </View>
          <View style={{ gap: 6, alignItems: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: t.text }}>Turn on notifications</Text>
            <Text style={{ fontSize: 15, lineHeight: 21, color: t.muted, textAlign: "center", maxWidth: 290 }}>
              Know when your groups post. You can mute any group at any time.
            </Text>
          </View>
          <View style={{ alignSelf: "stretch", gap: 6, marginTop: 4 }}>
            <PrimaryButton
              label="Turn on"
              busy={busy}
              onPress={async () => {
                setBusy(true);
                await registerForPush().catch(() => undefined);
                setBusy(false);
                close();
              }}
            />
            <Pressable onPress={close} style={{ height: 46, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 17, color: t.text }}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
