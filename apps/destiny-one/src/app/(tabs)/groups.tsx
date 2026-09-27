// Groups tab — the communities you belong to, as cards. Opens B2 Community.

import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { Avatar, EmptyState, ErrorState, LargeTitle } from "@/components/ui";
import { plural } from "@/lib/format";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function Groups() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { communities, communitiesError, refreshCommunities, isLeader } = useSession();

  useFocusEffect(
    useCallback(() => {
      void refreshCommunities();
    }, [refreshCommunities]),
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.grouped }} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 120 }}>
      <View style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
        {isLeader ? (
          <Pressable accessibilityRole="button" onPress={() => router.push("/new-group")}>
            {({ pressed }) => (
              <GlassSurface interactive style={[{ height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 16, opacity: pressed ? 0.7 : 1 }, t.shadow]}>
                <Icon name="plus" size={19} color={t.text} strokeWidth={2.2} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>New group</Text>
              </GlassSurface>
            )}
          </Pressable>
        ) : null}
      </View>
      <LargeTitle style={{ paddingHorizontal: 4, paddingTop: 2, paddingBottom: 6 }}>Groups</LargeTitle>
      <Text style={{ paddingHorizontal: 4, paddingBottom: 18, fontSize: 15, lineHeight: 20, color: t.muted }}>Communities you belong to.</Text>

      {!communities && communitiesError ? <ErrorState message={communitiesError} onRetry={() => void refreshCommunities()} /> : null}
      {communities && communities.length === 0 ? <EmptyState title="No communities yet" body="Your team leader will add you." /> : null}

      <View style={{ gap: 12 }}>
        {(communities ?? []).map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => router.push(`/community/${c.id}`)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 22, backgroundColor: pressed ? t.fill : t.card, borderWidth: 0.5, borderColor: t.glassLine }, t.shadow]}
          >
            <Avatar name={c.name} size={52} radius={16} />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{c.name}</Text>
              {c.description ? <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted }}>{c.description}</Text> : null}
              <Text style={{ fontSize: 13, color: t.subtle, marginTop: 2 }}>{plural(c.groups.length, "group")}</Text>
            </View>
            <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
