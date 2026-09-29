// Profile tab (D1–D5): your name and picture, accounts, notifications, problems and
// feedback, the notices again, your data, sign out. Tap your name to change it.

import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { D1_ROLE_LABELS, topRole } from "@destiny/shared";
import Constants from "expo-constants";
import { openDocument } from "@/components/SafetyNotice";
import { Avatar, Card, CardButton, LargeTitle, Separator, SettingsRow } from "@/components/ui";
import { api } from "@/lib/api";
import { cleanImage } from "@/lib/cleanImage";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, INK, useTheme } from "@/theme/tokens";

export default function Profile() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { me, setMe, email, signOut, accounts } = useSession();
  const others = accounts.length - 1;
  const [signingOut, setSigningOut] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const top = me ? topRole(me.roles) : null;
  const role = top ? D1_ROLE_LABELS[top] : "Member";

  async function exportData() {
    try {
      const data = await api.exportMyData();
      await Share.share({ title: "My Destiny One data", message: JSON.stringify(data, null, 2) });
    } catch (err) {
      Alert.alert("Couldn't download your data", errorMessage(err));
    }
  }

  async function changeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access in Settings to change your picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarBusy(true);
    try {
      // A fresh copy with no hidden details (no GPS location), as for chat photos.
      const clean = await cleanImage(asset.uri, asset.fileName ?? "avatar.jpg", asset.mimeType ?? "image/jpeg");
      const file = { uri: clean.uri, name: clean.name, type: clean.mimeType } as unknown as Blob;
      setMe(await api.uploadAvatar(file));
    } catch (err) {
      Alert.alert("Couldn't update your picture", errorMessage(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.grouped }} contentContainerStyle={{ paddingTop: insets.top + 52, paddingHorizontal: 16, paddingBottom: 110, gap: 22 }}>
      <LargeTitle style={{ paddingHorizontal: 4 }}>Profile</LargeTitle>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
        <Pressable onPress={changeAvatar} disabled={avatarBusy} style={{ opacity: avatarBusy ? 0.5 : 1 }}>
          <Avatar name={me?.displayName ?? ""} uri={me?.avatarUrl} size={60} />
          {avatarBusy && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={t.text} />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: "600", color: t.text }}>{me?.displayName}</Text>
          <Text numberOfLines={1} style={{ fontSize: 15, color: t.muted }}>
            {role}
            {email ? ` · ${email}` : ""}
          </Text>
          <Pressable onPress={changeAvatar} disabled={avatarBusy}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: ORANGE, marginTop: 2 }}>Change picture</Text>
          </Pressable>
        </View>
      </Card>
      <Card>
        <SettingsRow label="Change name" value={me?.displayName} onPress={() => router.push("/edit-name")} />
      </Card>

      <Card>
        <SettingsRow icon="plus" label="Add account" onPress={() => router.push("/add-account")} />
        {others > 0 ? (
          <>
            <Separator inset={62} />
            <SettingsRow icon="people" label="Switch account" value={String(accounts.length)} onPress={() => router.push("/accounts")} />
          </>
        ) : null}
      </Card>

      <Card>
        <SettingsRow icon="bell" iconBg={ORANGE} iconColor={INK} label="Notifications" onPress={() => router.push("/notifications")} />
        <Separator inset={62} />
        <SettingsRow icon="sliders" label="Appearance" onPress={() => router.push("/appearance")} />
        <Separator inset={62} />
        <SettingsRow icon="lock" label="Password" onPress={() => router.push("/set-password")} />
        <Separator inset={62} />
        <SettingsRow icon="alertCircle" label="Blocked people" onPress={() => router.push("/blocked")} />
      </Card>

      <Card>
        <SettingsRow icon="flag" label="Report a problem" onPress={() => router.push({ pathname: "/feedback", params: { kind: "problem" } })} />
        <Separator inset={62} />
        <SettingsRow icon="megaphone" label="Send feedback" onPress={() => router.push({ pathname: "/feedback", params: { kind: "idea" } })} />
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
          // Another account signed in on this phone takes over; otherwise, the welcome screen.
          router.replace("/");
        }}
      />
      <Text style={{ textAlign: "center", fontSize: 13, color: t.subtle }}>Destiny One {Constants.expoConfig?.version ?? ""}</Text>
    </ScrollView>
  );
}
