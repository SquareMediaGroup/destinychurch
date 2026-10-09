// A10 Setup — shown once to every member (AccessGuard sends them here the first time they reach the app):
// pick a look (System, Light, Dark, True dark) and whether read receipts are
// on. Both can be changed later in Profile. The theme applies live as they
// choose; read receipts are saved when they continue. Skipping keeps the
// defaults (System, receipts on).

import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Icon } from "@/components/Icon";
import { Card, FormError, LargeTitle, Lead, PrimaryButton, SectionLabel, TextButton } from "@/components/ui";
import { ModeSwatch } from "@/app/appearance";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { appearance, useAppearance, type ThemeMode } from "@/state/appearance";
import { markSetupSeen } from "@/state/setupSeen";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const MODES: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "black", label: "True dark" },
];

const RECEIPT_CHOICES: { on: boolean; title: string; body: string }[] = [
  { on: true, title: "Share read receipts", body: "People see when you've read their messages, and you see when they've read yours." },
  { on: false, title: "Keep them private", body: "No one sees when you've read their messages, and you don't see theirs." },
];

export default function Setup() {
  const t = useTheme();
  const { me, setMe } = useSession();
  const current = useAppearance();
  const [receipts, setReceipts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Remember it's been seen (so it never comes back), then on to the chats. */
  async function finish() {
    if (me) await markSetupSeen(me.id);
    router.replace("/chats");
  }

  async function done() {
    setBusy(true);
    setError(null);
    try {
      // Receipts default to on, so only a change needs saving.
      if (!receipts) setMe(await api.updateSettings({ readReceipts: false }));
      await finish();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          <FormError message={error} />
          <PrimaryButton label="Continue" onPress={done} busy={busy} />
          <TextButton label="Skip for now" onPress={() => void finish()} style={{ alignSelf: "center", paddingVertical: 8 }} />
        </>
      }
    >
      <View style={{ paddingTop: 30, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Make it yours</LargeTitle>
        <Lead>Two quick choices. You can change both any time in Profile.</Lead>
      </View>

      <View style={{ marginTop: 28, gap: 8 }}>
        <SectionLabel>Appearance</SectionLabel>
        <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12 }}>
          {MODES.map((o) => {
            const on = o.key === current.mode;
            return (
              <Pressable
                key={o.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={o.key === "system" ? "System, matches your phone" : o.label}
                onPress={() => {
                  if (!on) haptic.selection();
                  appearance.set({ mode: o.key });
                }}
                style={({ pressed }) => ({ flex: 1, gap: 6, alignItems: "center", transform: [{ scale: pressed ? 0.96 : 1 }] })}
              >
                <View style={{ width: "100%", height: 84, borderRadius: 16, overflow: "hidden", flexDirection: "row", borderWidth: on ? 3 : 1, borderColor: on ? t.tint : t.sep }}>
                  {o.key === "system" || o.key === "light" ? <ModeSwatch look="light" /> : null}
                  {o.key === "system" || o.key === "dark" ? <ModeSwatch look="dark" /> : null}
                  {o.key === "black" ? <ModeSwatch look="black" /> : null}
                </View>
                <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: on ? "600" : "400", color: t.text }}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 28, gap: 8 }}>
        <SectionLabel>Read receipts</SectionLabel>
        <Card>
          {RECEIPT_CHOICES.map((c, i) => {
            const on = c.on === receipts;
            return (
              <Pressable
                key={String(c.on)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  if (!on) haptic.selection();
                  setReceipts(c.on);
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent", borderTopWidth: i ? 0.5 : 0, borderTopColor: t.sep })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 17, color: t.text }}>{c.title}</Text>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: t.muted }}>{c.body}</Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 0 : 1.5, borderColor: t.subtle, backgroundColor: on ? t.tint : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on ? <Icon name="check" size={14} color={t.dark ? "#0E1013" : "#FFFFFF"} strokeWidth={3.2} /> : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      </View>
    </AuthScreen>
  );
}
