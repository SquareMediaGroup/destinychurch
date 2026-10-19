// B5 confirmation — back to the conversation on Done.

import { Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Icon } from "@/components/Icon";
import { Lead, SecondaryButton } from "@/components/ui";
import { useTheme } from "@/theme/tokens";

export default function ReportSent() {
  const t = useTheme();
  return (
    <AuthScreen footer={<SecondaryButton label="Done" onPress={() => router.back()} />}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="check" size={36} color={t.tint} strokeWidth={2.2} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", color: t.text }}>Report sent</Text>
        <Lead style={{ textAlign: "center", maxWidth: 300 }}>
          Thanks. Our team will take a look. The other person won&apos;t be told it was you. If someone is in danger right now, call 999.
        </Lead>
      </View>
    </AuthScreen>
  );
}
