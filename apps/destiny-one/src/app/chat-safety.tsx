// "How your chats are kept safe", re-readable from Settings.

import { useEffect } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafetyNotice } from "@/components/SafetyNotice";
import { Card, FloatingBack } from "@/components/ui";
import { markSafetyRead } from "@/state/welcomeChecklist";
import { useTheme } from "@/theme/tokens";

export default function ChatSafety() {
  const t = useTheme();
  // Ticks the Welcome checklist step.
  useEffect(() => markSafetyRead(), []);
  const insets = useSafeAreaInsets();
  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: t.grouped }} contentContainerStyle={{ paddingTop: insets.top + 66, paddingHorizontal: 16, paddingBottom: 40 }}>
        <Card>
          <SafetyNotice />
        </Card>
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </>
  );
}
