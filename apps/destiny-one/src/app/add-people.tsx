// C2 Add people (leaders). Two uses:
//   ?groupId=…      add straight to an existing group
//   ?communityId=…  choose people for New group (selection held in picker)
// Adult / Under 18 tags are shown here because leaders need them to keep the
// 2-adult rule; members never see them.

import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1DirectoryEntry } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, EmptyState, Field, ModalHeader, PrimaryButton, SectionLabel } from "@/components/ui";
import { api } from "@/lib/api";
import { picker, usePicked } from "@/state/picker";
import { errorMessage, useSession } from "@/state/session";
import { INK, ORANGE, useTheme } from "@/theme/tokens";

export default function AddPeople() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId, communityId: communityParam } = useLocalSearchParams<{ groupId?: string; communityId?: string }>();
  const { me, communities, refreshCommunities } = useSession();
  const forGroup = !!groupId;

  const groupCommunity = useMemo(() => {
    for (const c of communities ?? []) if (c.groups.some((g) => g.id === groupId)) return c;
    return null;
  }, [communities, groupId]);
  const communityId = communityParam ?? groupCommunity?.id;

  const pickedForNew = usePicked();
  const [pickedHere, setPickedHere] = useState<D1DirectoryEntry[]>([]);
  const picked = forGroup ? pickedHere : pickedForNew;
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<D1DirectoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (groupId) api.group(groupId).then((g) => setExisting(new Set(g.members.map((m) => m.id))), () => undefined);
  }, [groupId]);

  // Debounced directory search.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(() => {
      api
        .directory(query.trim(), communityId)
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, communityId]);

  const visible = (results ?? []).filter((p) => p.id !== me?.id && !existing.has(p.id));
  const isOn = (p: D1DirectoryEntry) => picked.some((x) => x.id === p.id);
  const toggle = (p: D1DirectoryEntry) => (forGroup ? setPickedHere((s) => (s.some((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : [...s, p])) : picker.toggle(p));

  async function done() {
    if (!forGroup) {
      router.back();
      return;
    }
    setBusy(true);
    try {
      await api.addGroupMembers(groupId, picked.map((p) => p.id));
      await refreshCommunities();
      router.back();
    } catch (err) {
      Alert.alert("Couldn't add people", errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const label = picked.length === 0 ? (forGroup ? "Add people" : "Done") : `Add ${picked.length} ${picked.length === 1 ? "person" : "people"}`;

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title="Add people" icon="back" />
      <Field
        value={query}
        onChangeText={setQuery}
        placeholder="Search people"
        radius={14}
        background={t.card}
        autoCorrect={false}
        containerStyle={{ marginTop: 10 }}
        inputStyle={{ minHeight: 42 }}
        leading={<Icon name="search" size={17} color={t.subtle} strokeWidth={2.2} />}
      />

      {picked.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 16 }} contentContainerStyle={{ gap: 14, paddingHorizontal: 4 }}>
          {picked.map((p) => (
            <Pressable key={p.id} onPress={() => toggle(p)} accessibilityLabel={`Remove ${p.displayName}`} style={{ width: 58, alignItems: "center", gap: 5 }}>
              <View>
                <Avatar name={p.displayName} size={52} />
                <View style={{ position: "absolute", top: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: t.fill2, borderWidth: 2, borderColor: t.grouped, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="close" size={9} color={t.text} strokeWidth={3.5} />
                </View>
              </View>
              <Text numberOfLines={1} style={{ fontSize: 12, color: t.muted }}>
                {p.displayName.split(" ")[0]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flex: 1, marginTop: 16, gap: 8 }}>
        <SectionLabel>{(forGroup ? groupCommunity?.name : communities?.find((c) => c.id === communityId)?.name) ?? "People"}</SectionLabel>
        {results === null ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            style={{ borderRadius: 22, backgroundColor: t.card, flexGrow: 0 }}
            ListEmptyComponent={loading ? null : <EmptyState title="No one found" body={query ? "Try a different name." : undefined} />}
            renderItem={({ item }) => {
              const on = isOn(item);
              return (
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(item)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent" })}>
                  {on ? (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center" }}>
                      <Icon name="check" size={13} color={INK} strokeWidth={3.4} />
                    </View>
                  ) : (
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: t.subtle }} />
                  )}
                  <Avatar name={item.displayName} size={38} />
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingRight: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
                    <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{item.displayName}</Text>
                    <Text style={{ fontSize: 13, color: item.isAdult ? t.subtle : t.tint }}>{item.isAdult ? "Adult" : "Under 18"}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <PrimaryButton label={label} onPress={done} busy={busy} disabled={forGroup && picked.length === 0} style={{ marginTop: 14 }} />
    </View>
  );
}
