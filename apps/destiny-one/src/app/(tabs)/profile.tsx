// Profile tab (D1–D5), grouped the way iOS Settings is: your name and picture
// at the top (tap the name to change it, the picture to change that), then
// Account, Preferences, Privacy and safety, Support and Your data, each under a
// heading. Sign out and the version at the bottom.

import { useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { D1_ROLE_LABELS, topRole } from "@destiny/shared";
import Constants from "expo-constants";
import { openDocument } from "@/components/SafetyNotice";
import { Icon } from "@/components/Icon";
import { Avatar, Card, CardButton, LargeTitle, SectionLabel, Separator, SettingsRow } from "@/components/ui";
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

  const [exporting, setExporting] = useState(false);
  const [savingReceipts, setSavingReceipts] = useState(false);

  async function setReadReceipts(on: boolean) {
    if (!me) return;
    setSavingReceipts(true);
    setMe({ ...me, readReceipts: on }); // the switch moves at once
    try {
      setMe(await api.updateSettings({ readReceipts: on }));
    } catch (err) {
      setMe({ ...me, readReceipts: !on });
      Alert.alert("Couldn't change read receipts", errorMessage(err));
    } finally {
      setSavingReceipts(false);
    }
  }

  /**
   * Saves everything we hold as a .json file and opens the share sheet on it,
   * so it can go to Files, AirDrop or email as a proper file. (It used to be
   * pasted into the share sheet as one enormous message.) Android's share
   * sheet can't take a file this way, so it still gets the text there.
   */
  async function exportData() {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await api.exportMyData();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === "ios") {
        const file = new File(Paths.cache, `destiny-one-data-${data.exportedAt.slice(0, 10)}.json`);
        if (file.exists) file.delete();
        file.create();
        file.write(json);
        await Share.share({ url: file.uri, title: "My Destiny One data" });
      } else {
        await Share.share({ title: "My Destiny One data", message: json });
      }
    } catch (err) {
      Alert.alert("Couldn't download your data", errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  /** With a picture set: choose a new one or remove it. Without: straight to the photo picker. */
  function changeAvatar() {
    if (!me?.avatarUrl) {
      void pickAvatar();
      return;
    }
    Alert.alert("Profile picture", undefined, [
      { text: "Choose photo", onPress: () => void pickAvatar() },
      { text: "Remove picture", style: "destructive", onPress: () => void removeAvatar() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    try {
      setMe(await api.removeAvatar());
    } catch (err) {
      Alert.alert("Couldn't remove your picture", errorMessage(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(
      "Sign out?",
      others > 0 ? "You'll switch to your other account on this phone." : "You can sign back in with your email at any time.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => void doSignOut() },
      ],
    );
  }

  async function doSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
    // Another account signed in on this phone takes over; otherwise, the welcome screen.
    router.replace("/");
  }

  async function pickAvatar() {
    // No permission request and no allowsEditing: both slow the picker down. The square crop happens in cleanImage.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarBusy(true);
    try {
      // A fresh copy with no hidden details (no GPS location), as for chat photos.
      const clean = await cleanImage(asset.uri, asset.fileName ?? "avatar.jpg", asset.mimeType ?? "image/jpeg", { square: true });
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

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingLeft: 16 }}>
        <Pressable onPress={changeAvatar} disabled={avatarBusy} accessibilityRole="button" accessibilityLabel={me?.avatarUrl ? "Change or remove your picture" : "Add a picture"} style={{ opacity: avatarBusy ? 0.5 : 1 }}>
          <Avatar name={me?.displayName ?? ""} uri={me?.avatarUrl} size={60} />
          {avatarBusy && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={t.text} />
            </View>
          )}
        </Pressable>
        {/* The name side of the card is the way to change your name, as in iOS Settings. */}
        <Pressable
          onPress={() => router.push("/edit-name")}
          accessibilityRole="button"
          accessibilityLabel={`${me?.displayName ?? "Your name"}, ${role}. Change name`}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 16, alignSelf: "stretch", opacity: pressed ? 0.6 : 1 })}
        >
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: "600", color: t.text }}>{me?.displayName}</Text>
            <Text numberOfLines={1} style={{ fontSize: 15, color: t.muted }}>
              {role}
              {email ? ` · ${email}` : ""}
            </Text>
            <Text style={{ fontSize: 14, color: t.subtle, marginTop: 2 }}>Change name</Text>
          </View>
          <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} />
        </Pressable>
      </Card>

      <Section title="Account">
        <SettingsRow icon="mail" label="Email" onPress={() => router.push("/change-email")} />
        <Separator inset={62} />
        <SettingsRow icon="lock" label="Password" onPress={() => router.push("/set-password")} />
        <Separator inset={62} />
        <SettingsRow icon="plus" label="Add account" onPress={() => router.push("/add-account")} />
        {others > 0 ? (
          <>
            <Separator inset={62} />
            <SettingsRow icon="people" label="Switch account" value={String(accounts.length)} onPress={() => router.push("/accounts")} />
          </>
        ) : null}
      </Section>

      <Section title="Preferences">
        <SettingsRow icon="bell" iconBg={ORANGE} iconColor={INK} label="Notifications" onPress={() => router.push("/notifications")} />
        <Separator inset={62} />
        <SettingsRow icon="sliders" label="Appearance" onPress={() => router.push("/appearance")} />
      </Section>

      <Section title="Privacy and safety">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, paddingHorizontal: 16 }}>
          <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: t.avatar, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, color: t.text }}>Read receipts</Text>
            <Text style={{ fontSize: 13, color: t.muted }}>Turn off and no one sees when you&apos;ve read their messages, and you don&apos;t see theirs.</Text>
          </View>
          <Switch value={me?.readReceipts ?? true} onValueChange={(on) => void setReadReceipts(on)} disabled={savingReceipts} trackColor={{ true: ORANGE }} accessibilityLabel="Read receipts" />
        </View>
        <Separator inset={62} />
        <SettingsRow icon="block" label="Blocked people" value={me?.blocked.length ? String(me.blocked.length) : undefined} onPress={() => router.push("/blocked")} />
        <Separator inset={62} />
        <SettingsRow icon="shield" label="How your chats are kept safe" onPress={() => router.push("/chat-safety")} />
        <Separator inset={62} />
        <SettingsRow icon="doc" label="Privacy notice" onPress={() => openDocument("privacy")} />
        <Separator inset={62} />
        <SettingsRow icon="terms" label="Terms" onPress={() => openDocument("terms")} />
      </Section>

      <Section title="Support">
        <SettingsRow icon="help" label="Help" onPress={() => router.push("/help")} />
        <Separator inset={62} />
        <SettingsRow icon="sparkle" label="What's new" onPress={() => router.push("/whats-new")} />
        <Separator inset={62} />
        <SettingsRow icon="flag" label="Report a problem" onPress={() => router.push({ pathname: "/feedback", params: { kind: "problem" } })} />
        <Separator inset={62} />
        <SettingsRow icon="megaphone" label="Send feedback" onPress={() => router.push({ pathname: "/feedback", params: { kind: "idea" } })} />
      </Section>

      <Section title="Your data">
        <SettingsRow icon="download" label={exporting ? "Preparing your data..." : "Download my data"} onPress={exporting ? undefined : () => void exportData()} />
        <Separator inset={62} />
        <SettingsRow icon="trash" iconBg="#D93A2B" label="Delete my account" onPress={() => router.push("/delete-account")} />
      </Section>

      <CardButton label="Sign out" busy={signingOut} onPress={confirmSignOut} />
      <Pressable onPress={() => router.push("/whats-new")} accessibilityRole="button" accessibilityLabel={`Destiny One ${Constants.expoConfig?.version ?? ""}. What's new`} hitSlop={8}>
        <Text style={{ textAlign: "center", fontSize: 13, color: t.subtle }}>Destiny One {Constants.expoConfig?.version ?? ""}</Text>
      </Pressable>
    </ScrollView>
  );
}

/** A heading over a card of rows, as in iOS Settings. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <SectionLabel>{title}</SectionLabel>
      <Card>{children}</Card>
    </View>
  );
}
