// What's new, from Profile → Support (and tapping the version at the bottom
// of Profile). Every release in RELEASES (src/lib/releases.ts), latest first.

import { ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Card, FloatingBack, LargeTitle, Lead, SectionLabel, Separator } from "@/components/ui";
import { RELEASES } from "@/lib/releases";
import { useTheme } from "@/theme/tokens";

export default function WhatsNew() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 22 }}>
        <View style={{ paddingHorizontal: 4, gap: 6 }}>
          <LargeTitle>What&apos;s new</LargeTitle>
          <Lead>{`You're on Destiny One ${Constants.expoConfig?.version ?? ""}.`}</Lead>
        </View>
        {RELEASES.map((r) => (
          <View key={r.version} style={{ gap: 7 }}>
            <SectionLabel>{`Version ${r.version}`}</SectionLabel>
            <Card>
              {r.features.map((f, i) => (
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
          </View>
        ))}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
