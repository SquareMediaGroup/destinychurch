// B6 Group info. Everyone: members, mute, search, leave. Leaders/admins
// (canManage): the rules panel, Add people, manage members (C3), Edit (C4).

import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkComposition, type D1GroupMember } from "@destiny/shared";
import { Icon, type IconName } from "@/components/Icon";
import { MemberTag, Avatar, Bone, Card, CardButton, ConfirmDialog, ErrorState, FloatingBack, SectionLabel, SkeletonGroup, SkeletonRows } from "@/components/ui";
import { api } from "@/lib/api";
import { cleanImage } from "@/lib/cleanImage";
import { plural } from "@/lib/format";
import { keys, removeGroupLocally, setGroup, updateGroupSummary, useGroup } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage, useSession } from "@/state/session";
import { INK, ORANGE, useTheme } from "@/theme/tokens";

export default function GroupInfo() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, communities } = useSession();
  const groupQuery = useGroup(id);
  const group = groupQuery.data ?? null;
  const error = groupQuery.error ? errorMessage(groupQuery.error) : null;
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);

  // Also used after a leader changes a member, so the list updates without waiting for the Realtime event.
  const load = () => void queryClient.refetchQueries({ queryKey: keys.group(id) });

  if (!group) {
    return (
      <View style={{ flex: 1, backgroundColor: t.grouped }}>
        {error ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ErrorState message={error} onRetry={load} />
          </View>
        ) : (
          <SkeletonGroup label="Loading group" style={{ paddingTop: insets.top + 56, paddingHorizontal: 16, gap: 20 }}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <Bone width={92} height={92} />
              <Bone width="50%" height={24} radius={8} />
              <Bone width="35%" height={14} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <Bone key={i} height={64} radius={18} style={{ flex: 1 }} />
              ))}
            </View>
            <SkeletonRows count={5} avatar={38} />
          </SkeletonGroup>
        )}
        <FloatingBack background={t.grouped} />
      </View>
    );
  }

  const community = communities?.find((c) => c.id === group.communityId);

  function applyIcon(updated: Awaited<ReturnType<typeof api.group>>) {
    setGroup(updated);
    updateGroupSummary(id, (g) => ({ ...g, iconUrl: updated.iconUrl }));
  }

  // Anyone in the group can change it. The first alert is where we ask people
  // not to use the church logo, so a chat list isn't a wall of identical icons.
  function changeIcon() {
    Alert.alert("Change group icon", "Please avoid using the Destiny Church logo, so groups are easy to tell apart.", [
      { text: "Cancel", style: "cancel" },
      ...(group?.iconUrl
        ? [
            {
              text: "Remove icon",
              style: "destructive" as const,
              onPress: async () => {
                setIconBusy(true);
                try {
                  applyIcon(await api.removeGroupIcon(id));
                } catch (err) {
                  Alert.alert("Couldn't remove the icon", errorMessage(err));
                } finally {
                  setIconBusy(false);
                }
              },
            },
          ]
        : []),
      { text: "Choose photo", onPress: () => void pickIcon() },
    ]);
  }

  async function pickIcon() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access in Settings to change the icon.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setIconBusy(true);
    try {
      // Re-encoded on the phone first (drops GPS location), as for chat photos and profile pictures.
      const clean = await cleanImage(asset.uri, asset.fileName ?? "icon.jpg", asset.mimeType ?? "image/jpeg");
      const file = { uri: clean.uri, name: clean.name, type: clean.mimeType } as unknown as Blob;
      applyIcon(await api.uploadGroupIcon(id, file));
    } catch (err) {
      Alert.alert("Couldn't update the icon", errorMessage(err));
    } finally {
      setIconBusy(false);
    }
  }
  const isAnnouncements = group.kind === "announcements";
  const rules = group.rules;
  const ruleOk = rules ? checkComposition(rules).ok : true;

  function manage(m: D1GroupMember) {
    if (!group?.canManage || m.id === me?.id) return;
    const options: { label: string; run: () => Promise<unknown>; destructive?: boolean }[] = [];
    if (m.role !== "admin" && m.isAdult) options.push({ label: "Make admin", run: () => api.addGroupMembers(group.id, [m.id], "admin") });
    options.push({
      label: "Remove from group",
      destructive: true,
      run: async () => {
        const after = rules ? checkComposition({ members: rules.members - 1, adults: rules.adults - (m.isAdult ? 1 : 0) }) : { ok: true as const };
        if (!after.ok && group.state === "active") {
          const go = await new Promise<boolean>((resolve) =>
            Alert.alert(`Remove ${m.displayName}?`, `The group will pause. ${after.reason} It reopens when the rules are met again.`, [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Remove", style: "destructive", onPress: () => resolve(true) },
            ]),
          );
          if (!go) return;
        }
        await api.removeGroupMember(group.id, m.id);
      },
    });
    const run = async (i: number) => {
      try {
        await options[i].run();
        load();
      } catch (err) {
        Alert.alert("Couldn't update the group", errorMessage(err));
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: m.displayName, options: [...options.map((o) => o.label), "Cancel"], cancelButtonIndex: options.length, destructiveButtonIndex: options.findIndex((o) => o.destructive) },
        (i) => i < options.length && void run(i),
      );
    } else {
      Alert.alert(m.displayName, undefined, [...options.map((o, i) => ({ text: o.label, style: o.destructive ? ("destructive" as const) : ("default" as const), onPress: () => void run(i) })), { text: "Cancel", style: "cancel" as const }]);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 40, gap: 20 }}>
        <View style={{ alignItems: "center", gap: 10 }}>
          <Pressable
            disabled={isAnnouncements || group.state !== "active" || iconBusy}
            onPress={changeIcon}
            accessibilityRole="button"
            accessibilityLabel="Change group icon"
            style={{ opacity: iconBusy ? 0.5 : 1 }}
          >
            <Avatar name={group.name} size={92} announcements={isAnnouncements} uri={group.iconUrl} />
          </Pressable>
          {!isAnnouncements && group.state === "active" ? (
            <Pressable onPress={changeIcon} disabled={iconBusy} accessibilityRole="button" hitSlop={8}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: t.tint }}>{iconBusy ? "Saving…" : "Change icon"}</Text>
            </Pressable>
          ) : null}
          <View style={{ alignItems: "center", gap: 3 }}>
            <Text style={{ fontSize: 26, fontWeight: "700", letterSpacing: 0.2, color: t.text, textAlign: "center" }}>{group.name}</Text>
            <Text style={{ fontSize: 15, color: t.muted }}>{[group.department ?? community?.name, plural(group.members.length, "member")].filter(Boolean).join(" · ")}</Text>
          </View>
          {group.description ? <Text style={{ fontSize: 15, lineHeight: 21, color: t.muted, maxWidth: 300, textAlign: "center" }}>{group.description}</Text> : null}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Tile icon="search" label="Search" onPress={() => router.push("/search")} />
          <Tile icon="bell" label={group.muted ? "Muted" : "Mute"} onPress={() => router.push({ pathname: "/notifications", params: { groupId: group.id } })} />
          {group.canManage ? <Tile icon="addPerson" label="Add people" onPress={() => router.push({ pathname: "/add-people", params: { groupId: group.id } })} /> : null}
        </View>

        {group.canManage && rules ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: ruleOk ? t.fill : ORANGE, alignItems: "center", justifyContent: "center" }}>
              <Icon name={ruleOk ? "check" : "alert"} size={16} color={ruleOk ? t.text : INK} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>
                {plural(rules.members, "person", "people")}, {plural(rules.adults, "adult")}
              </Text>
              <Text style={{ fontSize: 14, color: t.muted }}>{ruleOk ? "Meets the rules" : `Groups need at least ${rules.minMembers} people including ${rules.minAdults} adults`}</Text>
            </View>
          </Card>
        ) : null}

        {group.state === "frozen" && group.frozenReason ? (
          <Card style={{ flexDirection: "row", gap: 12, padding: 16 }}>
            <Icon name="pause" size={16} color={t.text} strokeWidth={3} />
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: t.muted }}>{group.frozenReason}</Text>
          </Card>
        ) : null}

        <View style={{ gap: 8 }}>
          <SectionLabel>{plural(group.members.length, "member")}</SectionLabel>
          <Card>
            {group.members.map((m) => (
              <Pressable key={m.id} disabled={!group.canManage || m.id === me?.id} onPress={() => manage(m)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent" })}>
                <Avatar name={m.displayName} size={38} />
                <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, color: t.text }}>
                    {m.displayName}
                    {m.id === me?.id ? " (You)" : ""}
                  </Text>
                  <MemberTag tag={m.tag} groupAdmin={m.role === "admin"} />
                  {m.isAdult !== undefined ? <Text style={{ fontSize: 13, color: m.isAdult ? t.subtle : t.tint }}>{m.isAdult ? "Adult" : "Under 18"}</Text> : null}
                </View>
              </Pressable>
            ))}
          </Card>
          {group.canManage ? <Text style={{ paddingHorizontal: 16, fontSize: 13, color: t.subtle }}>Tap someone to make them an admin or remove them.</Text> : null}
        </View>

        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingHorizontal: 16 }}>
          <Icon name="shield" size={15} color={t.subtle} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            Chats in this group aren&apos;t end-to-end encrypted. Leaders can look at them if someone raises a concern.
          </Text>
        </View>

        {group.canManage && !isAnnouncements ? <CardButton label="Edit group" onPress={() => router.push(`/group/${group.id}/edit`)} /> : null}
        {!isAnnouncements ? <CardButton label="Leave group" onPress={() => setLeaving(true)} /> : null}
      </ScrollView>
      <FloatingBack background={t.grouped} />

      <ConfirmDialog
        visible={leaving}
        title={`Leave ${group.name}?`}
        body="You won't get new messages from this group. A leader can add you back. If the group stops meeting the rules, it will pause."
        confirmLabel="Leave"
        busy={busy}
        onCancel={() => setLeaving(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api.leaveGroup(group.id);
            setLeaving(false);
            router.dismissTo("/chats");
            removeGroupLocally(group.id);
          } catch (err) {
            setLeaving(false);
            Alert.alert("Couldn't leave the group", errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, height: 64, borderRadius: 18, backgroundColor: pressed ? t.fill : t.card, borderWidth: 0.5, borderColor: t.glassLine, alignItems: "center", justifyContent: "center", gap: 4 })}>
      <Icon name={icon} size={21} color={t.tint} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: t.text }}>{label}</Text>
    </Pressable>
  );
}
