// Photo viewer: tap a photo in a chat (or in Group info → Photos and files).
// Full screen on black, like Photos: pinch or double-tap to zoom, swipe
// sideways through every photo in that chat, swipe down to close, tap to hide
// or show the bars. Save adds it to Photos; Share opens the share sheet.
//
// The photos come from the chat's cache (src/lib/queries.ts), so the viewer
// opens instantly and pages through whatever the chat has loaded. Links are
// signed and short-lived, so one that has expired is swapped for a fresh one
// as it comes on screen.
//
// Params: groupId, messageId (the photo to open on).

import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Image, PanResponder, Pressable, ScrollView, StatusBar, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signedUrlNeedsRefresh } from "@destiny/shared";
import { Icon, type IconName } from "@/components/Icon";
import { reduceMotion, springs } from "@/components/Motion";
import { clock, dayLabel } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { SaveRefusedError, downloadAttachment, isPhoto, savePhoto, shareFile, type Photo } from "@/lib/media";
import { useMessages } from "@/lib/queries";
import { refreshAttachmentUrls } from "@/lib/useConversation";
import { errorMessage } from "@/state/session";

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 260;
const DISMISS_DISTANCE = 120;

export default function Viewer() {
  const { groupId, messageId } = useLocalSearchParams<{ groupId: string; messageId: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const messages = useMessages(groupId).data?.messages;
  const photos = useMemo(() => (messages ?? []).filter(isPhoto), [messages]);
  const startIndex = Math.max(0, photos.findIndex((p) => p.id === Number(messageId)));
  const [index, setIndex] = useState(startIndex);
  const [chrome, setChrome] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Swipe down to close: the photo follows the finger and the black fades.
  // Not while zoomed in, where a downward drag pans the photo instead.
  const [drag] = useState(() => new Animated.Value(0));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => !zoomed && g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > 1.2) {
            haptic.tick();
            router.back();
          } else if (reduceMotion()) drag.setValue(0);
          else Animated.spring(drag, { toValue: 0, ...springs.enter, useNativeDriver: true }).start();
        },
      }),
    [zoomed, drag],
  );
  const backdrop = drag.interpolate({ inputRange: [0, 300], outputRange: [1, 0.2], extrapolate: "clamp" });

  const current = photos[index];

  // A link that has expired (cached chats outlive them) gets swapped as the photo comes on screen.
  useEffect(() => {
    if (current && (!current.attachment.url || signedUrlNeedsRefresh(current.attachment.url))) void refreshAttachmentUrls(groupId, [current]);
  }, [current, groupId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function act(kind: "save" | "share") {
    if (!current?.attachment.url || busy) return;
    setBusy(kind);
    try {
      const file = await downloadAttachment(current.attachment.url, current.attachment.id, current.attachment.mimeType);
      if (kind === "share") await shareFile(file, current.attachment.mimeType);
      else if ((await savePhoto(file, current.attachment.mimeType)) === "saved") {
        haptic.success();
        setToast("Saved to Photos");
      }
    } catch (err) {
      haptic.error();
      setToast(err instanceof SaveRefusedError ? err.message : errorMessage(err, kind === "save" ? "Couldn't save the photo." : "Couldn't share the photo."));
    } finally {
      setBusy(null);
    }
  }

  if (!current) {
    // Deleted while open, or nothing cached: there's nothing to show.
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Text style={{ color: "#FFF", fontSize: 17 }}>This photo isn&apos;t available.</Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10}>
          <Text style={{ color: "#FFF", fontSize: 17, fontWeight: "600" }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const who = current.mine ? "You" : current.sender?.displayName ?? "Former member";

  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden={!chrome} barStyle="light-content" animated />
      <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#000", opacity: backdrop }} />
      <Animated.View style={{ flex: 1, transform: [{ translateY: drag }] }} {...pan.panHandlers}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(p) => String(p.id)}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            if (next !== index) {
              haptic.selection();
              setIndex(next);
            }
          }}
          renderItem={({ item }) => (
            <ZoomablePhoto
              photo={item}
              width={width}
              height={height}
              onTap={() => setChrome((c) => !c)}
              onZoomChange={setZoomed}
            />
          )}
        />
      </Animated.View>

      {chrome ? (
        <>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 10, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(0,0,0,0.45)" }}>
            <BarButton icon="close" label="Close" onPress={() => router.back()} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text numberOfLines={1} style={{ color: "#FFF", fontSize: 16, fontWeight: "600" }}>{who}</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                {dayLabel(current.createdAt)}, {clock(current.createdAt)}
                {photos.length > 1 ? `  ·  ${index + 1} of ${photos.length}` : ""}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: insets.bottom + 10, paddingTop: 10, paddingHorizontal: 24, flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.45)" }}>
            <BarButton icon="share" label="Share" busy={busy === "share"} onPress={() => void act("share")} />
            <BarButton icon="download" label="Save to Photos" busy={busy === "save"} onPress={() => void act("save")} />
          </View>
        </>
      ) : null}

      {toast ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 84, alignItems: "center" }}>
          <Text style={{ overflow: "hidden", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "rgba(40,40,40,0.92)", color: "#FFF", fontSize: 14, maxWidth: 320, textAlign: "center" }}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

function BarButton({ icon, label, onPress, busy }: { icon: IconName; label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
      {busy ? <ActivityIndicator color="#FFF" /> : <Icon name={icon} size={22} color="#FFF" strokeWidth={2} />}
    </Pressable>
  );
}

/**
 * One photo, zoomable with the native scroll view (pinch, and a double tap
 * that toggles between fitted and 2.5×). A single tap waits out the double-tap
 * window before it shows or hides the bars.
 */
function ZoomablePhoto({ photo, width, height, onTap, onZoomChange }: { photo: Photo; width: number; height: number; onTap: () => void; onZoomChange: (zoomed: boolean) => void }) {
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const lastTap = useRef(0);
  const single = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (single.current) clearTimeout(single.current);
  }, []);

  function tap() {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (single.current) clearTimeout(single.current);
      const next = scale > 1.05 ? 1 : DOUBLE_TAP_ZOOM;
      haptic.selection();
      setScale(next);
      onZoomChange(next > 1);
      return;
    }
    lastTap.current = now;
    single.current = setTimeout(onTap, DOUBLE_TAP_MS);
  }

  function zoomEnded(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const z = e.nativeEvent.zoomScale ?? 1;
    setScale(z);
    onZoomChange(z > 1.05);
  }

  return (
    <ScrollView
      style={{ width, height }}
      contentContainerStyle={{ width, height, alignItems: "center", justifyContent: "center" }}
      maximumZoomScale={MAX_ZOOM}
      minimumZoomScale={1}
      zoomScale={scale}
      bouncesZoom
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onScrollEndDrag={zoomEnded}
      onMomentumScrollEnd={zoomEnded}
    >
      <Pressable onPress={tap} accessibilityRole="image" accessibilityLabel={`Photo from ${photo.mine ? "you" : photo.sender?.displayName ?? "a former member"}. Double tap to zoom.`}>
        {photo.attachment.url ? (
          <Image source={{ uri: photo.attachment.url }} style={{ width, height }} resizeMode="contain" onLoad={() => setLoaded(true)} />
        ) : (
          <View style={{ width, height }} />
        )}
        {!loaded ? <ActivityIndicator color="#FFF" style={{ position: "absolute", top: height / 2 - 10, left: width / 2 - 10 }} /> : null}
      </Pressable>
    </ScrollView>
  );
}
