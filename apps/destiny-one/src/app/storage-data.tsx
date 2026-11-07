// Storage and data: free up space on the phone, see how much media has been
// sent and received, choose the quality photos are sent at, and choose which
// media loads by itself on Wi-Fi or mobile data. All personal to this phone.

import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, FloatingBack, LargeTitle, SectionLabel, Separator, SettingsRow } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { AUTO_DOWNLOAD_OPTIONS, DEFAULT_DATA_SETTINGS, UPLOAD_QUALITY_OPTIONS, dataSettings, useDataSettings, type AutoDownload } from "@/state/dataSettings";
import { useTheme } from "@/theme/tokens";

/** Short labels for the value column; the picker spells them out. */
const SHORT: Record<AutoDownload, string> = { never: "Never", wifi: "Wi-Fi", always: "Wi-Fi and mobile" };

export default function StorageAndData() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useDataSettings();
  const isDefault = settings.photos === DEFAULT_DATA_SETTINGS.photos && settings.voice === DEFAULT_DATA_SETTINGS.voice;
  const quality = UPLOAD_QUALITY_OPTIONS.find((o) => o.key === settings.uploadQuality)?.label;

  function confirmReset() {
    Alert.alert("Reset auto-download settings?", `Photos go back to ${labelOf(DEFAULT_DATA_SETTINGS.photos)} and voice messages to ${labelOf(DEFAULT_DATA_SETTINGS.voice)}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          dataSettings.resetAutoDownload();
          haptic.success();
        },
      },
    ]);
  }

  const choose = (setting: "upload" | "photos" | "voice") => router.push({ pathname: "/data-choice", params: { setting } });

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 48, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>Storage and data</LargeTitle>

        <View style={{ gap: 7 }}>
          <SectionLabel>Storage</SectionLabel>
          <Card>
            <SettingsRow label="Free up storage" onPress={() => router.push("/storage")} />
          </Card>
        </View>

        <View style={{ gap: 7 }}>
          <SectionLabel>Network</SectionLabel>
          <Card>
            <SettingsRow label="Network usage" onPress={() => router.push("/network-usage")} />
          </Card>
        </View>

        <View style={{ gap: 7 }}>
          <SectionLabel>Media quality</SectionLabel>
          <Card>
            <SettingsRow label="Upload quality" value={quality} onPress={() => choose("upload")} />
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>The quality photos are sent at. Everyone in the chat sees the same version.</Text>
        </View>

        <View style={{ gap: 7 }}>
          <SectionLabel>Media auto-download</SectionLabel>
          <Card>
            <SettingsRow label="Photos" value={SHORT[settings.photos]} onPress={() => choose("photos")} />
            <Separator />
            <SettingsRow label="Voice messages" value={SHORT[settings.voice]} onPress={() => choose("voice")} />
            <Separator />
            <Pressable
              onPress={confirmReset}
              disabled={isDefault}
              accessibilityRole="button"
              style={({ pressed }) => ({ paddingVertical: 13, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent" })}
            >
              <Text style={{ fontSize: 17, color: isDefault ? t.subtle : "#D93A2B" }}>Reset auto-download settings</Text>
            </Pressable>
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            Anything that doesn&apos;t load by itself shows a download button instead. Documents always wait until you open them.
          </Text>
        </View>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}

function labelOf(key: AutoDownload): string {
  return AUTO_DOWNLOAD_OPTIONS.find((o) => o.key === key)!.label;
}
