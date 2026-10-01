// Search — groups (by name, department or community, from the cached chat
// list) and messages (GET /search/messages: only groups you're in, since you
// joined, never deleted messages).
//
// Two homes: the Search tab ("tab") and the full-screen search opened from
// inside a chat ("modal", with Cancel and the keyboard already up). Opened
// from a chat it searches that chat first ("In <group>"), with "All chats"
// one tap away. Tapping a message opens its chat scrolled to it.

import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MIN_SEARCH_CHARS, type D1CommunitySummary, type D1GroupSummary, type D1MessageHit } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, EmptyState, Field, LargeTitle, TextButton } from "@/components/ui";
import { api } from "@/lib/api";
import { listTime } from "@/lib/format";
import { prefetchGroup } from "@/lib/queries";
import { jumpTo } from "@/state/jump";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

type GroupHit = { g: D1GroupSummary; c: D1CommunitySummary };
type Item = { kind: "group"; hit: GroupHit } | { kind: "message"; hit: D1MessageHit };

/** A window of the body around the first matching word, split for highlighting. */
function snippet(body: string, query: string): { pre: string; hit: string; post: string } {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const lower = body.toLowerCase();
  let at = -1;
  let len = 0;
  for (const w of words) {
    const i = lower.indexOf(w);
    if (i >= 0 && (at < 0 || i < at)) {
      at = i;
      len = w.length;
    }
  }
  if (at < 0) return { pre: body, hit: "", post: "" };
  const start = Math.max(0, at - 40);
  return { pre: (start > 0 ? "…" : "") + body.slice(start, at), hit: body.slice(at, at + len), post: body.slice(at + len) };
}

/** `groupId`: the chat this search was opened from (modal only). */
export function SearchView({ mode, groupId }: { mode: "tab" | "modal"; groupId?: string }) {
  const isTab = mode === "tab";
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { communities } = useSession();
  const [query, setQuery] = useState("");
  const [allChats, setAllChats] = useState(false);
  const scope = groupId && !allChats ? groupId : undefined;
  const scopeName = useMemo(() => {
    for (const c of communities ?? []) for (const g of c.groups) if (g.id === groupId) return g.name;
    return null;
  }, [communities, groupId]);
  const [result, setResult] = useState<{ q: string; scope?: string; messages: D1MessageHit[]; error: string | null } | null>(null);
  const q = query.trim();
  // The last results stay on screen while the next search runs.
  const searching = q.length >= MIN_SEARCH_CHARS;
  const messages = searching ? (result?.messages ?? []) : [];
  const current = result?.q === q && result?.scope === scope;
  const loading = searching && !current;
  const error = searching && current ? result.error : null;

  // From the tab, results open on top of it. From a chat, its own messages go
  // back to it (past Group info, if that's where search was opened); other
  // chats replace the search.
  const open = (id: string) => {
    if (isTab) router.push(`/group/${id}`);
    else if (id === groupId) router.dismissTo(`/group/${id}`);
    else router.replace(`/group/${id}`);
  };
  const openMessage = (hit: D1MessageHit) => {
    jumpTo.set(hit.groupId, hit.id);
    open(hit.groupId);
  };

  const groups = useMemo(() => {
    const lq = q.toLowerCase();
    if (!lq || scope) return [];
    const out: GroupHit[] = [];
    for (const c of communities ?? [])
      for (const g of c.groups) if ([g.name, g.department ?? "", c.name].some((s) => s.toLowerCase().includes(lq))) out.push({ g, c });
    return out;
  }, [communities, q, scope]);

  // Debounced message search.
  useEffect(() => {
    if (q.length < MIN_SEARCH_CHARS) return;
    let cancelled = false;
    const id = setTimeout(() => {
      api.searchMessages(q, scope).then(
        (r) => !cancelled && setResult({ q, scope, messages: r, error: null }),
        (err) => !cancelled && setResult((prev) => ({ q, scope, messages: prev?.messages ?? [], error: errorMessage(err) })),
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, scope]);

  const sections = [
    ...(groups.length ? [{ title: "Groups", data: groups.map((hit): Item => ({ kind: "group", hit })) }] : []),
    ...(messages.length ? [{ title: "Messages", data: messages.map((hit): Item => ({ kind: "message", hit })) }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + (isTab ? 52 : 6) }}>
      {isTab ? <LargeTitle style={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 10 }}>Search</LargeTitle> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder={scope && scopeName ? `Search in ${scopeName}` : "Search messages and groups"}
          autoFocus={!isTab}
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
        {isTab ? null : <TextButton label="Cancel" onPress={() => router.back()} />}
      </View>

      {groupId && scopeName ? (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          {[
            { label: `In ${scopeName}`, on: !allChats, set: false },
            { label: "All chats", on: allChats, set: true },
          ].map((chip) => (
            <Pressable
              key={chip.label}
              accessibilityRole="button"
              accessibilityState={{ selected: chip.on }}
              onPress={() => setAllChats(chip.set)}
              style={{ maxWidth: "60%", minHeight: 32, borderRadius: 16, paddingHorizontal: 14, justifyContent: "center", backgroundColor: chip.on ? t.text : t.fill }}
            >
              <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={{ fontSize: 14, fontWeight: "600", color: chip.on ? t.bg : t.text }}>
                {chip.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => (item.kind === "group" ? `g${item.hit.g.id}` : `m${item.hit.id}`)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: isTab ? 120 : 40 }}
        renderSectionHeader={({ section }) => (
          <Text style={{ paddingHorizontal: 20, paddingBottom: 6, paddingTop: section.title === "Messages" && groups.length ? 14 : 0, fontSize: 13, fontWeight: "600", color: t.muted }}>{section.title}</Text>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />
          ) : error ? (
            <EmptyState title="Couldn't search" body={error} />
          ) : q ? (
            <EmptyState title="No results" body="Try a different word or name." />
          ) : isTab ? (
            <EmptyState title="Search your chats" body="Find a group by name, or a message by what it said." />
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === "group") {
            const { g, c } = item.hit;
            return (
              <Pressable onPressIn={() => prefetchGroup(g.id)} onPress={() => open(g.id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: pressed ? t.fill : "transparent" })}>
                <Avatar name={g.name} size={40} announcements={g.kind === "announcements"} uri={g.iconUrl} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{g.name}</Text>
                  <Text style={{ fontSize: 14, color: t.muted }}>{[g.department, c.name].filter(Boolean).join(" · ")}</Text>
                </View>
              </Pressable>
            );
          }
          const m = item.hit;
          const who = m.mine ? "You" : m.sender?.displayName ?? "Former member";
          const s = snippet(m.body, q);
          return (
            <Pressable onPressIn={() => prefetchGroup(m.groupId)} onPress={() => openMessage(m)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingLeft: 20, backgroundColor: pressed ? t.fill : "transparent" })}>
              <View style={{ marginTop: 10 }}>
                <Avatar name={m.sender?.displayName ?? "Former member"} size={40} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2, paddingTop: 10, paddingBottom: 12, paddingRight: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: "600", color: t.text }}>
                    {who}
                    {scope ? null : <Text style={{ fontWeight: "400", color: t.muted }}> in {m.groupName}</Text>}
                  </Text>
                  <Text style={{ fontSize: 14, color: t.subtle }}>{listTime(m.createdAt)}</Text>
                </View>
                <Text numberOfLines={3} style={{ fontSize: 15, lineHeight: 20, color: t.muted }}>
                  {s.pre}
                  {s.hit ? <Text style={{ color: t.text, fontWeight: "600", backgroundColor: t.accentSoft }}>{s.hit}</Text> : null}
                  {s.post}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
