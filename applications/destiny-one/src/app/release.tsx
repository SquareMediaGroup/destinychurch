// Release splash — shown once, over the app, the first time someone opens a
// new X.X release (or a patch whose entry asks for it). See lib/releases.ts.

import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Card, LargeTitle, Lead, PrimaryButton, Separator } from "@/components/ui";
import { markReleaseSeen, pendingSplash, splashRelease } from "@/lib/releaseSplash";
import type { Release } from "@/lib/releases";
import Constants from "expo-constants";
import { useTheme } from "@/theme/tokens";

export default function ReleaseSplash() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [release, setRelease] = useState<Release | null>(() => splashRelease(Constants.expoConfig?.version ?? "0"));

  useEffect(() => {
    // Opened by hand with nothing to show: just close.
    void pendingSplash().then((r) => {
      if (!r) router.back();
      else setRelease(r);
    });
  }, []);

  async function done() {
    await markReleaseSeen();
    router.back();
  }

  if (!release) return <View style={{ flex: 1, backgroundColor: t.grouped }} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 16, paddingBottom: 24, gap: 22 }}>
        <View style={{ paddingHorizontal: 4, gap: 6 }}>
          <LargeTitle>What&apos;s new</LargeTitle>
          <Lead>{`Destiny One ${release.version}`}</Lead>
        </View>
        <Card>
          {release.features.map((f, i) => (
            <View key={f.title}>
              {i > 0 ? <Separator inset={62} /> : null}
              <View style={{ flexDirection: "row", gap: 14, paddingVertical: 12, paddingHorizontal: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={f.icon} size={17} color={t.tint} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>{f.title}</Text>
                  <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted }}>{f.body}</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <PrimaryButton label="Continue" onPress={done} />
      </View>
    </View>
  );
}
