// Settings tab (D1–D4): profile, notifications, the notices again, your data,
// sign out. Your name is read-only — the church office sets it.

import { useState } from "react";
import { Alert, ScrollView, Share, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { openDocument } from "@/components/SafetyNotice";
import { Avatar, Card, CardButton, LargeTitle, Separator, SettingsRow } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, INK, useTheme } from "@/theme/tokens";

export default function Settings() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { me, email, isLeader, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const role = me?.roles.includes("senior_leadership") ? "Senior leadership" : isLeader ? "Group leader" : "Member";

  async function exportData() {
    try {
      const data = await api.exportMyData();
      await Share.share({ title: "My Destiny One data", message: JSON.stringify(data, null, 2) });
    } catch (err) {
      Alert.alert("Couldn't download your data", errorMessage(err));
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.grouped }} contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 120, gap: 22 }}>
      <LargeTitle style={{ paddingHorizontal: 4 }}>Settings</LargeTitle>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
        <Avatar name={me?.displayName ?? ""} size={60} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: "600", color: t.text }}>{me?.displayName}</Text>
          <Text numberOfLines={1} style={{ fontSize: 15, color: t.muted }}>
            {role}
            {email ? ` · ${email}` : ""}
          </Text>
        </View>
      </Card>
      <Text style={{ marginTop: -14, paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
        Ask the church office to change your name.
      </Text>

      <Card>
        <SettingsRow icon="bell" iconBg={ORANGE} iconColor={INK} label="Notifications" onPress={() => router.push("/notifications")} />
      </Card>

      <Card>
        <SettingsRow icon="shield" label="How your chats are kept safe" onPress={() => router.push("/chat-safety")} />
        <Separator inset={62} />
        <SettingsRow icon="doc" label="Privacy notice" onPress={() => openDocument("privacy")} />
        <Separator inset={62} />
        <SettingsRow icon="terms" label="Terms" onPress={() => openDocument("terms")} />
      </Card>

      <Card>
        <SettingsRow label="Download my data" onPress={exportData} />
        <Separator />
        <SettingsRow label="Delete my account" onPress={() => router.push("/delete-account")} />
      </Card>

      <CardButton
        label="Sign out"
        busy={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
          router.replace("/welcome");
        }}
      />
      <Text style={{ textAlign: "center", fontSize: 13, color: t.subtle }}>Destiny One {Constants.expoConfig?.version ?? ""}</Text>
    </ScrollView>
  );
}
