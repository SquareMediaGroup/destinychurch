// Free up storage: how much Destiny One keeps on this phone, and a button to
// clear the photos, voice messages and files it has downloaded. They load
// again from the chat when they're next opened. See src/lib/storage.ts.

import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, CardButton, FloatingBack, LargeTitle, SectionLabel, Separator } from "@/components/ui";
import { formatBytes } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { clearMedia, storageUse, type StorageUse } from "@/lib/storage";
import { dataSettings } from "@/state/dataSettings";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function FreeUpStorage() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [use, setUse] = useState<StorageUse | null>(null);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(() => {
    storageUse().then(setUse, () => setUse({ mediaBytes: 0, messagesBytes: 0, freeBytes: null }));
  }, []);
  useFocusEffect(refresh);

  function confirmClear() {
    Alert.alert("Clear downloaded media?", "Photos, voice messages and files stay in your chats. They download again when you next open them.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => void clear() },
    ]);
  }

  async function clear() {
    setClearing(true);
    try {
      const freed = clearMedia();
      dataSettings.forgetDownloaded();
      haptic.success();
      refresh();
      Alert.alert("Storage cleared", freed > 0 ? `${formatBytes(freed)} freed.` : "There was nothing to clear.");
    } catch {
      Alert.alert("Couldn't clear everything", "Some files were in use. Try again in a moment.");
      refresh();
    } finally {
      setClearing(false);
    }
  }

  const total = use ? use.mediaBytes + use.messagesBytes : 0;
  const mediaShare = use && total > 0 ? use.mediaBytes / total : 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 48, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>Free up storage</LargeTitle>

        <Card style={{ padding: 16, gap: 12 }}>
          {use ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <Text style={{ fontSize: 28, fontWeight: "700", color: t.text }}>{formatBytes(total)}</Text>
                {use.freeBytes ? <Text style={{ fontSize: 15, color: t.muted }}>{formatBytes(use.freeBytes)} free on this phone</Text> : null}
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.fill, overflow: "hidden", flexDirection: "row" }}>
                <View style={{ width: `${mediaShare * 100}%`, backgroundColor: ORANGE }} />
                <View style={{ flex: 1, backgroundColor: t.avatar, opacity: total > 0 ? 1 : 0 }} />
              </View>
              <Text style={{ fontSize: 13, color: t.subtle }}>Used by Destiny One</Text>
            </>
          ) : (
            <ActivityIndicator color={t.tint} style={{ paddingVertical: 20 }} />
          )}
        </Card>

        <View style={{ gap: 7 }}>
          <SectionLabel>On this phone</SectionLabel>
          <Card>
            <Row swatch={ORANGE} label="Media and files" value={use ? formatBytes(use.mediaBytes) : ""} />
            <Separator inset={40} />
            <Row swatch={t.avatar} label="Saved messages" value={use ? formatBytes(use.messagesBytes) : ""} />
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            Saved messages are the most recent in each chat, kept so your chats open without a connection. They take care of themselves.
          </Text>
        </View>

        <CardButton label="Clear downloaded media" busy={clearing} onPress={confirmClear} />
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}

function Row({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: swatch }} />
      <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{label}</Text>
      <Text style={{ fontSize: 17, color: t.muted }}>{value}</Text>
    </View>
  );
}
