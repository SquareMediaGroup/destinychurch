// Shown instead of the whole app when this build is too old (spec E5) or the
// app is switched off for maintenance. The root layout lays it over the whole
// app, so nothing behind it can be reached.

import { Linking, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { D1AppConfig } from "@destiny/shared";
import { AuthScreen } from "@/components/AuthScreen";
import { LOGO_XML } from "@/components/logoXml";
import { Lead, PrimaryButton } from "@/components/ui";
import { useTheme } from "@/theme/tokens";

const COPY = {
  update: {
    title: "Update Destiny One",
    body: "This version of Destiny One is out of date. Update it to keep chatting.",
  },
  maintenance: {
    title: "Back soon",
    body: "Destiny One is down for maintenance. Please try again shortly.",
  },
} as const;

export function UpdateScreen({ mode, config, platform }: { mode: "update" | "maintenance"; config: D1AppConfig | undefined; platform: string }) {
  const t = useTheme();
  const message = mode === "update" ? config?.forceUpdateMessage : config?.maintenanceMessage;
  const storeUrl = platform === "android" ? config?.storeUrl.android : config?.storeUrl.ios;

  return (
    <AuthScreen
      footer={mode === "update" && storeUrl ? <PrimaryButton label="Update" onPress={() => void Linking.openURL(storeUrl)} /> : undefined}
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <View style={{ width: 88, height: 88 }}>
          <SvgXml xml={LOGO_XML} width={88} height={88} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", letterSpacing: 0.2, color: t.text }}>{COPY[mode].title}</Text>
        <Lead style={{ textAlign: "center", maxWidth: 300 }}>{message || COPY[mode].body}</Lead>
      </View>
    </AuthScreen>
  );
}
