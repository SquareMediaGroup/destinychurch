// "How your chats are kept safe" — the plain-words chat review notice, shown
// on A9 Notices and again from Settings. Never a lock icon or "encrypted".

import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Icon } from "@/components/Icon";
import { config } from "@/lib/config";
import { useTheme } from "@/theme/tokens";

export const SAFETY_POINTS = [
  "Every group always has at least 2 adults in it, so no one is ever chatting alone.",
  "Chats aren't end-to-end encrypted, so our team can step in if something doesn't look right. That's how we keep everyone safe here.",
  "If a message is deleted, we keep a copy for a little while in case we ever need to check something.",
  "Notification previews show who messaged you and the start of what they said. You can turn this off any time by muting a group.",
];

export function openDocument(doc: "privacy" | "terms") {
  void WebBrowser.openBrowserAsync(`${config.apiBaseUrl}/${doc}`);
}

export function SafetyNotice() {
  const t = useTheme();
  return (
    <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="shield" size={19} color={t.tint} strokeWidth={1.8} />
        </View>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: t.text }}>How your chats are kept safe</Text>
      </View>
      <View style={{ paddingLeft: 48, gap: 10 }}>
        {SAFETY_POINTS.map((p) => (
          <Text key={p} style={{ fontSize: 15, lineHeight: 21, color: t.muted }}>
            {p}
          </Text>
        ))}
      </View>
    </View>
  );
}
