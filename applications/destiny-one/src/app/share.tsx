// Share to a group: something shared into Destiny One from another app
// (Photos, Files, Safari…). Shows what's coming in, then the chats you can
// post in; pick one and it's sent there, and that chat opens.
//
// Photos go through cleanImage like any photo sent from the app (re-encoded,
// so no location or other hidden details leave the phone). PDFs up to 20 MB.
// Text and links become the message text. Anything else is refused with a
// reason. Up to 5 photos at a time (the share extension's limit too).

import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useIncomingShare, type ResolvedSharePayload } from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES, MAX_MESSAGE_LENGTH, type D1GroupSummary } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, Card, EmptyState, FormError, SectionLabel } from "@/components/ui";
import { api } from "@/lib/api";
import { cleanImage } from "@/lib/cleanImage";
import { haptic } from "@/lib/haptics";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { uploadAttachment } from "@/lib/upload";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

const MAX_PHOTOS = 5;

type Outgoing = { kind: "text"; text: string } | { kind: "file"; uri: string; name: string; mimeType: string; size: number | null };

/** What was shared, turned into what we'd send, plus anything we can't. */
function prepare(payloads: ResolvedSharePayload[]): { items: Outgoing[]; refused: string | null } {
  const items: Outgoing[] = [];
  let refused: string | null = null;
  const texts: string[] = [];
  for (const p of payloads) {
    if (p.contentType === "text" || p.contentType === "website" || p.shareType === "text" || p.shareType === "url") {
      const text = p.value?.trim();
      if (text) texts.push(text);
      continue;
    }
    const uri = "contentUri" in p ? p.contentUri : null;
    const mimeType = p.contentMimeType ?? p.mimeType ?? "";
    if (!uri || !(ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType)) {
      refused = "You can share photos, PDFs, links and text to Destiny One.";
      continue;
    }
    if (!mimeType.startsWith("image/") && p.contentSize != null && p.contentSize > MAX_ATTACHMENT_BYTES) {
      refused = "Files can be up to 20 MB.";
      continue;
    }
    items.push({ kind: "file", uri, name: p.originalName ?? (mimeType.startsWith("image/") ? "Photo.jpg" : "Document.pdf"), mimeType, size: p.contentSize ?? null });
  }
  const photos = items.filter((i) => i.kind === "file" && i.mimeType.startsWith("image/"));
  if (photos.length > MAX_PHOTOS) refused = `Up to ${MAX_PHOTOS} photos at a time.`;
  const kept = items.filter((i) => i.kind !== "file" || !i.mimeType.startsWith("image/") || photos.indexOf(i) < MAX_PHOTOS);
  if (texts.length) kept.unshift({ kind: "text", text: [...new Set(texts)].join("\n").slice(0, MAX_MESSAGE_LENGTH) });
  return { items: kept, refused };
}

/** The groups this person can post in right now, chat-list order. */
function postable(groups: D1GroupSummary[]): D1GroupSummary[] {
  return groups.filter((g) => g.state === "active" && (g.kind !== "announcements" || g.myRole === "admin"));
}

export default function Share() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { me, communities } = useSession();
  const { resolvedSharedPayloads, isResolving, clearSharedPayloads, error: resolveError } = useIncomingShare();
  const { items, refused } = useMemo(() => prepare(resolvedSharedPayloads), [resolvedSharedPayloads]);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signedIn = me?.onboarding === "active";
  const groups = (communities ?? []).flatMap((c) => postable(c.groups).map((g) => ({ g, community: c.name })));

  function close() {
    clearSharedPayloads();
    router.replace("/(tabs)/chats");
  }

  async function sendTo(groupId: string) {
    if (sending || !items.length) return;
    setSending(groupId);
    setError(null);
    try {
      for (const item of items) {
        if (item.kind === "text") {
          await api.send(groupId, { body: item.text });
          continue;
        }
        // Photos get a clean copy first, exactly as from the composer.
        const file = item.mimeType.startsWith("image/") ? await cleanImage(item.uri, item.name, item.mimeType).then((c) => ({ uri: c.uri, name: c.name, mimeType: c.mimeType, size: null })) : item;
        const attachmentId = await uploadAttachment(groupId, file);
        await api.send(groupId, { attachmentId });
      }
      haptic.success();
      clearSharedPayloads();
      void queryClient.invalidateQueries({ queryKey: keys.messages(groupId) });
      router.replace("/(tabs)/chats");
      router.push(`/group/${groupId}`);
    } catch (err) {
      haptic.error();
      setError(errorMessage(err, "Couldn't send that. Try again."));
    } finally {
      setSending(null);
    }
  }

  const photos = items.filter((i): i is Extract<Outgoing, { kind: "file" }> => i.kind === "file" && i.mimeType.startsWith("image/"));
  const files = items.filter((i): i is Extract<Outgoing, { kind: "file" }> => i.kind === "file" && !i.mimeType.startsWith("image/"));
  const text = items.find((i): i is Extract<Outgoing, { kind: "text" }> => i.kind === "text");

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16 }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={close} accessibilityRole="button" hitSlop={10}>
          <Text style={{ fontSize: 17, color: t.tint }}>Cancel</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: t.text, marginRight: 50 }}>Share to a group</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30, gap: 20 }}>
        {isResolving ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 30 }} />
        ) : !signedIn ? (
          <EmptyState title="Sign in first" body="Open Destiny One and sign in, then share again." />
        ) : items.length === 0 ? (
          <EmptyState title="Nothing to share" body={refused ?? resolveError?.message ?? "This can't be shared to Destiny One."} />
        ) : (
          <>
            <Card style={{ padding: 12, gap: 10 }}>
              {photos.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {photos.map((p) => (
                    <Image key={p.uri} source={{ uri: p.uri }} style={{ width: 84, height: 84, borderRadius: 10, backgroundColor: t.fill }} />
                  ))}
                </ScrollView>
              ) : null}
              {files.map((f) => (
                <View key={f.uri} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: t.avatar, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="doc" size={18} color="#FFFFFF" strokeWidth={1.9} />
                  </View>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, color: t.text }}>{f.name}</Text>
                </View>
              ))}
              {text ? (
                <Text numberOfLines={5} style={{ fontSize: 15, lineHeight: 20, color: t.text }}>
                  {text.text}
                </Text>
              ) : null}
              {refused ? <Text style={{ fontSize: 13, color: t.muted }}>{refused}</Text> : null}
            </Card>
            <FormError message={error} live />
            <View style={{ gap: 7 }}>
              <SectionLabel>Send to</SectionLabel>
              {groups.length === 0 ? (
                <EmptyState title="No chats to post in" body="You're not in any group you can post in yet." />
              ) : (
                <Card>
                  {groups.map(({ g, community }, i) => (
                    <Pressable
                      key={g.id}
                      disabled={!!sending}
                      onPress={() => void sendTo(g.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Send to ${g.name}`}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent", opacity: sending && sending !== g.id ? 0.5 : 1 })}
                    >
                      <Avatar name={g.name} size={36} announcements={g.kind === "announcements"} uri={g.iconUrl} />
                      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingRight: 16, borderBottomWidth: i < groups.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: t.sep }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={1} style={{ fontSize: 17, color: t.text }}>{g.name}</Text>
                          <Text numberOfLines={1} style={{ fontSize: 13, color: t.muted }}>{community}</Text>
                        </View>
                        {sending === g.id ? <ActivityIndicator color={ORANGE} /> : <Icon name="send" size={16} color={t.subtle} strokeWidth={2.4} />}
                      </View>
                    </Pressable>
                  ))}
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
