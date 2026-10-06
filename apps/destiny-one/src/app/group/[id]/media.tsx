// Group info → Photos and files. Everything shared in this chat that you can
// see (since you joined, not deleted, not from anyone you've blocked), newest
// first. Photos as a square grid that opens the viewer; files as a list that
// opens them. Scrolling to the end loads older ones.

import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, FloatingBack, LargeTitle } from "@/components/ui";
import { api } from "@/lib/api";
import { dayLabel, fileMeta } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { isPhoto } from "@/lib/media";
import { keys, useGroupMedia, type LocalMessage, type MessagesData } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { refreshAttachmentUrls } from "@/lib/useConversation";
import { errorMessage } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

type Tab = "photos" | "files";
const COLUMNS = 3;
const GAP = 2;

export default function GroupMedia() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useGroupMedia(id);
  const [tab, setTab] = useState<Tab>("photos");
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Newest first on this screen.
  const all = useMemo(() => [...(query.data?.messages ?? [])].reverse(), [query.data]);
  const photos = useMemo(() => all.filter(isPhoto), [all]);
  const files = useMemo(() => all.filter((m) => m.attachment && !m.attachment.mimeType.startsWith("image/")), [all]);
  const nextBefore = query.data?.nextBefore ?? null;

  async function loadOlder() {
    if (!nextBefore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.groupMedia(id, { before: nextBefore, limit: 60 });
      queryClient.setQueryData<MessagesData>(keys.media(id), (old) => ({
        messages: [...page.messages, ...(old?.messages ?? []).filter((m) => !page.messages.some((p) => p.id === m.id))],
        nextBefore: page.nextBefore,
      }));
    } catch {
      // Scrolling to the end again retries.
    } finally {
      setLoadingOlder(false);
    }
  }

  async function openFile(m: LocalMessage) {
    if (!m.attachment) return;
    // Links in the cache may have expired: always ask for a fresh one before opening.
    const fresh = (await refreshAttachmentUrls(id, [{ ...m, attachment: { ...m.attachment, url: null } }])).get(m.attachment.id);
    const url = fresh ?? m.attachment.url;
    if (url) void WebBrowser.openBrowserAsync(url);
  }

  const cell = (width - 32 - GAP * (COLUMNS - 1)) / COLUMNS;
  const footer = loadingOlder ? <ActivityIndicator color={ORANGE} style={{ paddingVertical: 16 }} /> : null;

  const header = (
    <View style={{ paddingTop: insets.top + 56, paddingBottom: 14, gap: 14 }}>
      <LargeTitle style={{ paddingHorizontal: 4 }}>Photos and files</LargeTitle>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 2, borderRadius: 10, backgroundColor: t.fill }}>
        {(["photos", "files"] as Tab[]).map((k) => {
          const on = tab === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptic.selection();
                setTab(k);
              }}
              style={{ flex: 1, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: on ? t.card : "transparent" }}
            >
              <Text style={{ fontSize: 14, fontWeight: on ? "600" : "400", color: t.text }}>{k === "photos" ? `Photos${photos.length ? ` (${photos.length})` : ""}` : `Files${files.length ? ` (${files.length})` : ""}`}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (!query.data) {
    return (
      <View style={{ flex: 1, backgroundColor: t.grouped, paddingHorizontal: 16 }}>
        {header}
        {query.error ? <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} /> : <ActivityIndicator color={ORANGE} style={{ marginTop: 40 }} />}
        <FloatingBack background={t.grouped} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      {tab === "photos" ? (
        <FlatList
          key="photos"
          data={photos}
          numColumns={COLUMNS}
          keyExtractor={(m) => String(m.id)}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={<EmptyState title="No photos yet" body="Photos sent in this chat show up here." />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          onEndReached={() => void loadOlder()}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/viewer", params: { groupId: id, messageId: String(item.id) } })}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo from ${item.mine ? "you" : item.sender?.displayName ?? "a former member"}, ${dayLabel(item.createdAt)}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Image source={{ uri: item.attachment?.url ?? undefined }} style={{ width: cell, height: cell, backgroundColor: t.fill }} resizeMode="cover" />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          key="files"
          data={files}
          keyExtractor={(m) => String(m.id)}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={<EmptyState title="No files yet" body="Documents sent in this chat show up here." />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          onEndReached={() => void loadOlder()}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => void openFile(item)}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: pressed ? t.fill : t.card })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.avatar, alignItems: "center", justifyContent: "center" }}>
                <Icon name="doc" size={19} color="#FFFFFF" strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "600", color: t.text }}>
                  {item.attachment?.mimeType === "application/pdf" ? "PDF document" : "File"}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 13, color: t.muted }}>
                  {[item.mine ? "You" : item.sender?.displayName ?? "Former member", dayLabel(item.createdAt), fileMeta(item.attachment!.mimeType, item.attachment!.sizeBytes)].join(" · ")}
                </Text>
              </View>
              <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} />
            </Pressable>
          )}
        />
      )}
      <FloatingBack background={t.grouped} />
    </View>
  );
}
