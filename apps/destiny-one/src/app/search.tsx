// Search — groups by name, department or community.
//
// The design also searches message text. There's no message-search endpoint
// yet (messages are only readable through the BFF, a page at a time), so this
// searches groups only until one is added.

import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1CommunitySummary, D1GroupSummary } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, EmptyState, Field, TextButton } from "@/components/ui";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Search() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { communities } = useSession();
  const [query, setQuery] = useState("");

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: { g: D1GroupSummary; c: D1CommunitySummary }[] = [];
    for (const c of communities ?? [])
      for (const g of c.groups) if ([g.name, g.department ?? "", c.name].some((s) => s.toLowerCase().includes(q))) out.push({ g, c });
    return out;
  }, [communities, query]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Search groups"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          radius={23}
          background={t.fill}
          containerStyle={{ flex: 1 }}
          inputStyle={{ minHeight: 43 }}
          leading={<Icon name="search" size={17} color={t.subtle} strokeWidth={2.2} />}
          footer={
            query ? (
              <Pressable onPress={() => setQuery("")} accessibilityLabel="Clear" style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.subtle, alignItems: "center", justifyContent: "center" }}>
                <Icon name="close" size={9} color={t.bg} strokeWidth={4} />
              </Pressable>
            ) : null
          }
        />
        <TextButton label="Cancel" onPress={() => router.back()} />
      </View>

      <FlatList
        data={hits}
        keyExtractor={(h) => h.g.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 18, paddingBottom: 40 }}
        ListHeaderComponent={hits.length ? <Text style={{ paddingHorizontal: 20, paddingBottom: 6, fontSize: 13, fontWeight: "600", color: t.muted }}>Groups</Text> : null}
        ListEmptyComponent={query.trim() ? <EmptyState title="No results" body="Try a different word or name." /> : null}
        renderItem={({ item: { g, c } }) => (
          <Pressable onPress={() => router.replace(`/group/${g.id}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: pressed ? t.fill : "transparent" })}>
            <Avatar name={g.name} size={40} announcements={g.kind === "announcements"} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{g.name}</Text>
              <Text style={{ fontSize: 14, color: t.muted }}>{[g.department, c.name].filter(Boolean).join(" · ")}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
