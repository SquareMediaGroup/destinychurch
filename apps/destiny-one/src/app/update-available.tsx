// "Update available": shown once per new X.X release to anyone on an older
// one, as a sheet they can close. See src/lib/updatePrompt.ts.

import { useEffect } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { LargeTitle, Lead, PrimaryButton, SecondaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { INSTALLED_VERSION, offeredVersion } from "@/lib/updatePrompt";
import { useTheme } from "@/theme/tokens";

export default function UpdateAvailable() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { data: config } = useQuery({ queryKey: keys.appConfig, queryFn: () => api.appConfig() });
  const version = offeredVersion(config);
  const notes = config?.latestVersionNotes ?? [];
  const storeUrl = Platform.OS === "android" ? config?.storeUrl.android : config?.storeUrl.ios;

  // Opened with nothing to offer (turned off since, or already up to date): just close.
  useEffect(() => {
    if (config && !version) router.back();
  }, [config, version]);

  // Marked seen when it opened (lib/updatePrompt.ts), so both buttons just close.
  function update() {
    router.back();
    if (storeUrl) void Linking.openURL(storeUrl);
  }

  if (!version) return null;
  return (
    <View style={{ paddingTop: 28, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 20 }}>
      <View style={{ gap: 6 }}>
        <LargeTitle>Update available</LargeTitle>
        <Lead>{`Destiny One ${version} is ready. You're on ${INSTALLED_VERSION}.`}</Lead>
      </View>
      {notes.length ? (
        <View style={{ gap: 12 }}>
          {notes.map((note) => (
            <View key={note} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="sparkle" size={14} color={t.tint} strokeWidth={2} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, lineHeight: 22, color: t.text, paddingTop: 2 }}>{note}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        {storeUrl ? <PrimaryButton label="Update" onPress={update} /> : null}
        <SecondaryButton label="Not now" onPress={() => router.back()} />
      </View>
    </View>
  );
}
