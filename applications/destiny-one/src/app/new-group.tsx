// C1 New group (leaders). A group can be created with any number of people;
// until it has at least 3 including 2 adults it is paused (read-only) and opens
// itself once the rule holds. The live note counts you in.

import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkComposition, MIN_GROUP_ADULTS, MIN_GROUP_MEMBERS, type D1CommunitySummary } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, Card, Field, FieldLabel, FormError, ModalHeader, PrimaryButton, Separator } from "@/components/ui";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import { invalidateCommunities, keys, setGroup } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { picker, usePicked } from "@/state/picker";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";
import { haptic } from "@/lib/haptics";

export default function NewGroup() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ communityId?: string }>();
  const { me, communities } = useSession();
  const manageable = useMemo(() => (communities ?? []).filter((c) => c.canManage), [communities]);
  // Chosen explicitly, else the one we came from, else the first we can manage
  // (derived, because the chat list may still be loading on first render).
  const [chosenId, setCommunityId] = useState<string | null>(null);
  const communityId = chosenId ?? params.communityId ?? manageable[0]?.id ?? null;
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = usePicked();

  // Fresh selection each time the screen opens.
  useEffect(() => {
    picker.clear();
    return () => picker.clear();
  }, []);

  const community = manageable.find((c) => c.id === communityId) ?? null;
  const members = picked.length + 1;
  const adults = picked.filter((p) => p.isAdult).length + (me?.isAdult ? 1 : 0);
  const rule = checkComposition({ members, adults });

  function cycleCommunity() {
    if (manageable.length < 2) return;
    const i = manageable.findIndex((c) => c.id === communityId);
    setCommunityId(manageable[(i + 1) % manageable.length].id);
    picker.clear();
  }

  async function create() {
    if (!community) return;
    setBusy(true);
    setError(null);
    try {
      const g = await api.createGroup(community.id, {
        name: name.trim(),
        department: department.trim() || undefined,
        description: description.trim() || undefined,
        memberIds: picked.map((p) => p.id),
      });
      // Show it everywhere at once; the chat list confirms in the background.
      setGroup(g);
      queryClient.setQueryData<D1CommunitySummary[]>(keys.communities, (old) =>
        old?.map((c) => (c.id === g.communityId && !c.groups.some((x) => x.id === g.id) ? { ...c, groups: [...c.groups, g] } : c)),
      );
      invalidateCommunities();
      haptic.success();
      router.dismiss();
      router.push(`/group/${g.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="New group" />
      <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <FieldLabel>Name</FieldLabel>
          <Field value={name} onChangeText={setName} placeholder="e.g. Sound Crew" background={t.card} autoCapitalize="words" />
        </View>
        <View style={{ gap: 8 }}>
          <FieldLabel optional>Description</FieldLabel>
          <Field value={description} onChangeText={setDescription} placeholder="What's this group for?" multiline background={t.card} />
        </View>

        <Card>
          <Pressable onPress={cycleCommunity} disabled={manageable.length < 2} accessibilityHint={manageable.length > 1 ? "Changes community" : undefined} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ flex: 1, fontSize: 17, color: t.text }}>Community</Text>
            <Text style={{ fontSize: 17, color: t.muted }}>{community?.name ?? "None"}</Text>
            {manageable.length > 1 ? <Icon name="updown" size={14} color={t.subtle} strokeWidth={2.4} /> : null}
          </Pressable>
          <Separator />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, paddingRight: 8 }}>
            <Text style={{ fontSize: 17, color: t.text }}>Department</Text>
            <Field value={department} onChangeText={setDepartment} placeholder="Optional" background={t.card} containerStyle={{ flex: 1 }} inputStyle={{ textAlign: "right", minHeight: 48 }} />
          </View>
        </Card>

        <View style={{ gap: 8 }}>
          <FieldLabel>People</FieldLabel>
          <Card>
            <Pressable
              disabled={!community}
              onPress={() => router.push({ pathname: "/add-people", params: { communityId: community?.id } })}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent" })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="plus" size={18} color={t.tint} strokeWidth={2.2} />
              </View>
              <Text style={{ flex: 1, fontSize: 17, color: t.tint }}>Add people</Text>
            </Pressable>
            {picked.map((p) => (
              <View key={p.id}>
                <Separator inset={64} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
                  <Avatar name={p.displayName} size={36} />
                  <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{p.displayName}</Text>
                  <Text style={{ fontSize: 13, color: p.isAdult ? t.subtle : t.tint }}>{p.isAdult ? "Adult" : "Under 18"}</Text>
                  <Pressable onPress={() => picker.toggle(p)} accessibilityLabel={`Remove ${p.displayName}`} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="close" size={11} color={t.muted} strokeWidth={3} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4, paddingTop: 2 }}>
            <Icon name={rule.ok ? "check" : "alertCircle"} size={15} color={rule.ok ? t.text : t.tint} strokeWidth={rule.ok ? 2.6 : 2.2} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: t.muted }}>
              <Text style={{ fontWeight: "600", color: t.text }}>
                {plural(members, "person", "people")}, {plural(adults, "adult")}
              </Text>{" "}
              including you. {rule.ok ? "Meets the rules." : `Groups need at least ${MIN_GROUP_MEMBERS} people including ${MIN_GROUP_ADULTS} adults. You can create it now, but it will be paused until then.`}
            </Text>
          </View>
        </View>
        <FormError message={error} />
      </ScrollView>
      <PrimaryButton label={rule.ok ? "Create group" : "Create paused group"} onPress={create} busy={busy} disabled={!community || !name.trim()} style={{ marginTop: 14 }} />
    </View>
  );
}
