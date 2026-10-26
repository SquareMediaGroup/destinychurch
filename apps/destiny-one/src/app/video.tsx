// Video player: tap a video in a chat. Full screen on black with the system's
// own controls. Videos are deleted 28 days after they are sent, so Keep saves a
// copy to Photos (iOS) or opens the share sheet to save it (Android) before then.
//
// The video streams from its signed link, which is short-lived: one that has
// expired is swapped for a fresh one before it plays.
//
// Params: groupId, messageId.

import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StatusBar, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signedUrlNeedsRefresh } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { expiresIn, formatBytes } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { SaveRefusedError, downloadAttachment, isVideo, savePhoto, shareFile } from "@/lib/media";
import { useMessages } from "@/lib/queries";
import { refreshAttachmentUrls } from "@/lib/useConversation";
import { errorMessage } from "@/state/session";

export default function VideoScreen() {
  const { groupId, messageId } = useLocalSearchParams<{ groupId: string; messageId: string }>();
  const insets = useSafeAreaInsets();
  const message = useMessages(groupId).data?.messages.find((m) => m.id === Number(messageId));
  const video = message && isVideo(message) && !message.attachment.expired ? message : null;
  const [busy, setBusy] = useState<"keep" | "share" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // An expired link is swapped for a fresh one, and the player picks up the new url.
  const url = video?.attachment.url ?? null;
  useEffect(() => {
    if (video && (!url || signedUrlNeedsRefresh(url))) void refreshAttachmentUrls(groupId, [video]);
  }, [groupId, video, url]);

  const player = useVideoPlayer(url && !signedUrlNeedsRefresh(url) ? url : null, (p) => {
    p.play();
  });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  async function act(kind: "keep" | "share") {
    if (!video?.attachment.url || busy) return;
    setBusy(kind);
    try {
      const file = await downloadAttachment(video.attachment.url, video.attachment.id, video.attachment.mimeType);
      if (kind === "share") await shareFile(file, video.attachment.mimeType);
      else if ((await savePhoto(file, video.attachment.mimeType)) === "saved") {
        haptic.success();
        setToast("Kept in Photos");
      }
    } catch (err) {
      haptic.error();
      setToast(err instanceof SaveRefusedError ? err.message : errorMessage(err, kind === "keep" ? "Couldn't keep the video." : "Couldn't share the video."));
    } finally {
      setBusy(null);
    }
  }

  if (!video) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Text style={{ color: "#FFF", fontSize: 17 }}>This video isn&apos;t available.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
          <Text style={{ color: "#FFF", fontSize: 17, fontWeight: "600" }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const left = expiresIn(video.attachment.expiresAt);
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" />
      {url && !signedUrlNeedsRefresh(url) ? (
        <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} style={{ flex: 1 }} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#FFF" />
        </View>
      )}

      <View style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} pointerEvents="box-none">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="close" size={18} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
        {left ? (
          <View style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "600" }}>{left}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 70, flexDirection: "row", gap: 12, justifyContent: "center" }} pointerEvents="box-none">
        <Pressable
          onPress={() => void act("keep")}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel={`Keep this video${video.attachment.sizeBytes != null ? `, ${formatBytes(video.attachment.sizeBytes)}` : ""}`}
          style={{ height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", gap: 8, opacity: busy ? 0.6 : 1 }}
        >
          {busy === "keep" ? <ActivityIndicator color="#000" /> : <Icon name="download" size={16} color="#000" strokeWidth={2} />}
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#000" }}>Keep</Text>
        </Pressable>
        <Pressable
          onPress={() => void act("share")}
          disabled={busy !== null}
          accessibilityRole="button"
          accessibilityLabel="Share this video"
          style={{ height: 44, paddingHorizontal: 22, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)", flexDirection: "row", alignItems: "center", gap: 8, opacity: busy ? 0.6 : 1 }}
        >
          <Icon name="share" size={16} color="#FFFFFF" strokeWidth={2} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFF" }}>Share</Text>
        </Pressable>
      </View>

      {toast ? (
        <View style={{ position: "absolute", left: 24, right: 24, bottom: insets.bottom + 20, padding: 12, borderRadius: 14, backgroundColor: "rgba(40,40,44,0.95)" }}>
          <Text style={{ color: "#FFF", fontSize: 15, textAlign: "center" }}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}
