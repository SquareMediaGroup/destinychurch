// "How your chats are kept safe" — the plain-words chat review notice, shown
// on A9 Notices and again from Settings. Never a lock icon or "encrypted".

import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Icon } from "@/components/Icon";
import { config } from "@/lib/config";
import { useTheme } from "@/theme/tokens";

export const SAFETY_POINTS = [
  "Chats are not end-to-end encrypted. The safeguarding team can review them if a concern is raised.",
  "Deleted messages are kept for a time, in case they're needed for safeguarding.",
  "Every group has at least 2 adults. If a group drops below that, it pauses until the rule is met again.",
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
