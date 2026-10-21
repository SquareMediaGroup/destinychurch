// One choice from Storage and data: upload quality (?setting=upload), or when
// photos (?setting=photos) or voice messages (?setting=voice) load by
// themselves. A tick list; the choice is saved as soon as it's tapped.

import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, FloatingBack, LargeTitle, PickRow, Separator } from "@/components/ui";
import { AUTO_DOWNLOAD_OPTIONS, UPLOAD_QUALITY_OPTIONS, dataSettings, useDataSettings } from "@/state/dataSettings";
import { useTheme } from "@/theme/tokens";

type Setting = "upload" | "photos" | "voice";

const COPY: Record<Setting, { title: string; note: string }> = {
  upload: { title: "Upload quality", note: "HD photos look sharper on big screens but take longer to send and use more data. Standard is plenty for a phone." },
  photos: { title: "Photos", note: "When photos in your chats load by themselves. Otherwise, tap a photo to load it." },
  voice: { title: "Voice messages", note: "When voice messages are fetched ahead, so they play straight away. Otherwise they load when you press play." },
};

export default function DataChoice() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { setting: raw } = useLocalSearchParams<{ setting?: string }>();
  const setting: Setting = raw === "photos" || raw === "voice" ? raw : "upload";
  const settings = useDataSettings();
  const copy = COPY[setting];

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 48, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>{copy.title}</LargeTitle>
        <View style={{ gap: 8 }}>
          <Card>
            {setting === "upload"
              ? UPLOAD_QUALITY_OPTIONS.map((o, i) => (
                  <View key={o.key}>
                    {i > 0 ? <Separator /> : null}
                    <PickRow label={o.label} on={settings.uploadQuality === o.key} onPress={() => dataSettings.set({ uploadQuality: o.key })} />
                  </View>
                ))
              : AUTO_DOWNLOAD_OPTIONS.map((o, i) => (
                  <View key={o.key}>
                    {i > 0 ? <Separator /> : null}
                    <PickRow label={o.label} on={settings[setting] === o.key} onPress={() => dataSettings.set({ [setting]: o.key })} />
                  </View>
                ))}
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>{copy.note}</Text>
        </View>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}
