// The composer's "+" menu: a Liquid Glass panel that grows out of the + button
// (anchored to it, scaling up from its corner on a spring), one row per option
// with an icon in a round well and a label, the rows following in a quick
// stagger. Tap outside or pick a row to close; it shrinks back into the button.
//
// Camera doesn't leave: the panel itself morphs into a tall rounded camera
// card (its frame and corners spring from the menu's to the card's while the
// page behind darkens), and the viewfinder fades in once it has landed. Back
// morphs it into the menu again. After a shot you review it in the same card
// and either retake or use it; the photo is then re-encoded like every other
// image (src/lib/cleanImage.ts, via the composer), so no location leaves the phone.
//
// On Android and older iOS the glass falls back to the app's solid surface.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, Image, Linking, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface, liquidGlass } from "@/components/GlassSurface";
import { Icon, type IconName } from "@/components/Icon";
import { Appear, PressableScale, reduceMotion } from "@/components/Motion";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

/** Where the + button is on screen (from measureInWindow), so the menu can grow out of it. */
export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  anchor: MenuAnchor | null;
  onClose: () => void;
  onPhotos: () => void;
  /** A photo taken in the camera card (a local file uri). */
  onPhoto: (uri: string) => void;
  onDocument: () => void;
  onPoll: () => void;
  onEvent: () => void;
}

const MENU_WIDTH = 260;
const MENU_RADIUS = 32;
const CARD_RADIUS = 40;
/** Open: lively, a hint of overshoot. Close: quick and flat, back into the button. */
const OPEN = { stiffness: 380, damping: 26, mass: 1 } as const;
const CLOSE = { stiffness: 520, damping: 40, mass: 1 } as const;
/** Menu to camera and back: a soft, slightly bouncy morph. */
const MORPH = { stiffness: 230, damping: 25, mass: 1 } as const;

export function AttachSheet({ visible, anchor, onClose, onPhotos, onPhoto, onDocument, onPoll, onEvent }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [p] = useState(() => new Animated.Value(0));
  // 0 = menu, 1 = camera card. Drives the frame (width, height, corners), so it runs on the JS thread.
  const [m] = useState(() => new Animated.Value(0));
  const [camera, setCamera] = useState<"off" | "opening" | "on" | "closing">("off");
  const [menuH, setMenuH] = useState(5 * 58 + 20);
  // Mount as soon as it's asked for; unmount only once it has shrunk away.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    const done = ({ finished }: { finished: boolean }) => {
      if (finished && !visible) {
        setMounted(false);
        setCamera("off");
        m.setValue(0);
      }
    };
    if (reduceMotion()) Animated.timing(p, { toValue: visible ? 1 : 0, duration: 160, useNativeDriver: true }).start(done);
    else Animated.spring(p, { toValue: visible ? 1 : 0, ...(visible ? OPEN : CLOSE), restDisplacementThreshold: 0.01, useNativeDriver: true }).start(done);
  }, [visible, mounted, p, m]);

  function morph(to: 0 | 1) {
    setCamera(to ? "opening" : "closing");
    const done = ({ finished }: { finished: boolean }) => finished && setCamera(to ? "on" : "off");
    if (reduceMotion()) Animated.timing(m, { toValue: to, duration: 200, useNativeDriver: false }).start(done);
    else Animated.spring(m, { toValue: to, ...MORPH, useNativeDriver: false }).start(done);
  }

  const inCamera = camera !== "off";
  const close = () => (camera === "on" ? morph(0) : onClose());

  // The menu: above the + button, left edges lined up, kept on screen whatever the anchor.
  const menuLeft = Math.min(Math.max(12, anchor?.x ?? 12), screenW - MENU_WIDTH - 12);
  const menuBottom = anchor ? screenH - anchor.y + 10 : 110;
  // The camera card: nearly full width, from about a fifth of the way down to just above the home indicator.
  const cardLeft = 10;
  const cardBottom = Math.max(insets.bottom - 14, 10);
  const cardH = screenH - Math.max(insets.top + 80, screenH * 0.2) - cardBottom;
  const frame = {
    left: m.interpolate({ inputRange: [0, 1], outputRange: [menuLeft, cardLeft] }),
    bottom: m.interpolate({ inputRange: [0, 1], outputRange: [menuBottom, cardBottom] }),
    width: m.interpolate({ inputRange: [0, 1], outputRange: [MENU_WIDTH, screenW - cardLeft * 2] }),
    height: m.interpolate({ inputRange: [0, 1], outputRange: [menuH, cardH] }),
  };
  const radius = m.interpolate({ inputRange: [0, 1], outputRange: [MENU_RADIUS, CARD_RADIUS] });

  const items: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: "camera", label: "Camera", onPress: () => morph(1) },
    { icon: "photo", label: "Photos", onPress: onPhotos },
    { icon: "doc", label: "Document", onPress: onDocument },
    { icon: "poll", label: "Poll", onPress: onPoll },
    { icon: "calendar", label: "Event", onPress: onEvent },
  ];

  // The glass itself is never faded (it stops rendering at opacity 0); it only scales. Its contents fade.
  const scale = reduceMotion() ? 1 : p.interpolate({ inputRange: [0, 1], outputRange: [0.18, 1] });
  const contentOpacity = p.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1], extrapolate: "clamp" });
  const originY = screenH - menuBottom;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={close}>
      {inCamera ? <StatusBar style="light" /> : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.18)", opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }) }]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: m.interpolate({ inputRange: [0, 1], outputRange: [0, 0.82], extrapolate: "clamp" }) }]} />
      <Pressable accessibilityLabel={camera === "on" ? "Back to the menu" : "Close menu"} onPress={close} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { transformOrigin: [menuLeft, originY, 0], transform: [{ scale }] }]}>
        <Animated.View style={[{ position: "absolute", borderRadius: radius }, frame]}>
          <GlassSurface style={[{ flex: 1, borderRadius: inCamera ? CARD_RADIUS : MENU_RADIUS }, t.shadow]}>
            <Animated.View style={{ opacity: contentOpacity, flex: 1 }}>
              <Animated.View
                accessibilityRole="menu"
                pointerEvents={inCamera ? "none" : "auto"}
                onLayout={(e) => {
                  if (!inCamera) setMenuH(Math.round(e.nativeEvent.layout.height));
                }}
                style={{ position: "absolute", top: 0, left: 0, width: MENU_WIDTH, paddingVertical: 10, opacity: m.interpolate({ inputRange: [0, 0.35], outputRange: [1, 0], extrapolate: "clamp" }) }}
              >
                {items.map((item, i) => (
                  <Row key={item.label} {...item} index={i} count={items.length} progress={p} />
                ))}
              </Animated.View>
              {inCamera ? (
                <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden", backgroundColor: "#000", opacity: m.interpolate({ inputRange: [0.25, 0.8], outputRange: [0, 1], extrapolate: "clamp" }) }]}>
                  <CameraPane
                    live={camera === "on"}
                    onBack={() => {
                      haptic.selection();
                      morph(0);
                    }}
                    onUse={onPhoto}
                  />
                </Animated.View>
              ) : null}
            </Animated.View>
          </GlassSurface>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Row({ icon, label, onPress, index, count, progress }: { icon: IconName; label: string; onPress: () => void; index: number; count: number; progress: Animated.Value }) {
  const t = useTheme();
  // The bottom row (nearest the button) leads, the rest follow upwards.
  const lag = ((count - 1 - index) / count) * 0.35;
  const y = reduceMotion() ? 0 : progress.interpolate({ inputRange: [0, lag, Math.min(lag + 0.65, 1)], outputRange: [14, 14, 0], extrapolate: "clamp" });
  return (
    <Animated.View style={{ transform: [{ translateY: y }] }}>
      <Pressable
        accessibilityRole="menuitem"
        accessibilityLabel={label}
        onPress={() => {
          haptic.selection();
          onPress();
        }}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 8, paddingVertical: 7, paddingHorizontal: 8, borderRadius: 22, backgroundColor: pressed ? t.fill : "transparent" })}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.dark ? "rgba(255,255,255,0.1)" : "rgba(14,16,19,0.06)", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={21} color={t.text} strokeWidth={1.9} />
        </View>
        <Text maxFontSizeMultiplier={1.4} style={{ flex: 1, fontSize: 18, letterSpacing: -0.3, color: t.text }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Camera card ─────────────────────────────────────────────────────────────

/** Smoky glass for controls over the viewfinder; a dark translucent disc where there's no Liquid Glass. */
function DarkGlass({ style, interactive, children }: { style: ViewStyle; interactive?: boolean; children: ReactNode }) {
  if (liquidGlass) {
    return (
      <GlassSurface interactive={interactive} variant="clear" tintColor="rgba(0,0,0,0.35)" style={style}>
        {children}
      </GlassSurface>
    );
  }
  return <View style={[style, { backgroundColor: "rgba(20,20,22,0.6)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.18)" }]}>{children}</View>;
}

/** A round dark-glass control over the viewfinder. */
function CamButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.88} hitSlop={4}>
      <DarkGlass interactive style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={22} color={active ? "#FFD60A" : "#FFFFFF"} strokeWidth={2.1} />
      </DarkGlass>
    </PressableScale>
  );
}

/**
 * The viewfinder and its controls, inside the card. `live` turns the camera on
 * only once the morph has landed, so the preview isn't resized every frame.
 */
function CameraPane({ live, onBack, onUse }: { live: boolean; onBack: () => void; onUse: (uri: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blink] = useState(() => new Animated.Value(0));

  // Ask as soon as the card is open, unless we already know the answer.
  useEffect(() => {
    if (live && permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [live, permission, requestPermission]);

  async function capture() {
    if (busy || !cam.current) return;
    setBusy(true);
    setError(null);
    setMore(false);
    haptic.press();
    // A quick white blink, like the system camera's shutter.
    blink.setValue(0.85);
    Animated.timing(blink, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    try {
      const pic = await cam.current.takePictureAsync({ quality: 1, skipProcessing: false });
      setShot(pic.uri);
    } catch {
      setError("Couldn't take the photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const row = { position: "absolute" as const, left: 18, right: 18, bottom: 20, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const };

  if (shot) {
    return (
      <View style={{ flex: 1 }}>
        <Image source={{ uri: shot }} resizeMode="cover" style={StyleSheet.absoluteFill} />
        <Appear from={{ y: 12 }} style={row}>
          <PressableScale
            accessibilityRole="button"
            onPress={() => {
              haptic.selection();
              setShot(null);
            }}
            scaleTo={0.92}
          >
            <DarkGlass interactive style={{ height: 52, paddingHorizontal: 22, borderRadius: 26, justifyContent: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "600" }}>Retake</Text>
            </DarkGlass>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            onPress={() => {
              haptic.success();
              onUse(shot);
            }}
            scaleTo={0.92}
            style={{ height: 52, paddingHorizontal: 24, borderRadius: 26, justifyContent: "center", backgroundColor: "#FFFFFF" }}
          >
            <Text style={{ color: "#0E1013", fontSize: 17, fontWeight: "600" }}>Use photo</Text>
          </PressableScale>
        </Appear>
      </View>
    );
  }

  const granted = permission?.granted;
  return (
    <View style={{ flex: 1 }}>
      {live && granted ? (
        <Appear from={{ scale: 1.04 }} style={StyleSheet.absoluteFill}>
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} flash={flash} mode="picture" onMountError={() => setError("The camera isn't available on this device.")} />
        </Appear>
      ) : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", opacity: blink }]} />

      {live && !permission ? <ActivityIndicator color="#FFFFFF" style={{ marginTop: 80 }} /> : null}
      {live && permission && !granted ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32, paddingBottom: 90 }}>
          <Text maxFontSizeMultiplier={1.4} style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700", textAlign: "center" }}>
            Camera access is off
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center" }}>
            Allow the camera to take a photo to send in a chat.
          </Text>
          <Pressable
            onPress={() => (permission.canAskAgain ? void requestPermission() : void Linking.openSettings())}
            accessibilityRole="button"
            style={{ marginTop: 8, backgroundColor: "#FFFFFF", borderRadius: 999, paddingHorizontal: 24, height: 48, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#0E1013", fontSize: 16, fontWeight: "600" }}>{permission.canAskAgain ? "Allow camera" : "Open Settings"}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={{ position: "absolute", top: 20, left: 20, right: 20, alignItems: "center" }}>
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600", textAlign: "center", backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, overflow: "hidden" }}>{error}</Text>
        </View>
      ) : null}

      {/* The extra controls fan up above the "more" button, nearest first. */}
      {more ? (
        <View style={{ position: "absolute", right: 18, bottom: 20 + 56 + 14, gap: 14, alignItems: "flex-end" }}>
          {(
            [
              { icon: "flip", label: "Switch camera", onPress: () => { setFacing((f) => (f === "back" ? "front" : "back")); setFlash("off"); } },
              ...(facing === "back" ? [{ icon: flash === "on" ? "bolt" : "boltOff", label: flash === "on" ? "Turn flash off" : "Turn flash on", active: flash === "on", onPress: () => setFlash((f) => (f === "off" ? "on" : "off")) }] : []),
            ] as { icon: IconName; label: string; active?: boolean; onPress: () => void }[]
          )
            .reverse()
            .map((b, i, all) => (
              <Appear key={b.label} delay={(all.length - 1 - i) * 40} from={{ y: 18, scale: 0.6 }}>
                <CamButton
                  icon={b.icon}
                  label={b.label}
                  active={b.active}
                  onPress={() => {
                    haptic.selection();
                    b.onPress();
                  }}
                />
              </Appear>
            ))}
        </View>
      ) : null}

      <View style={row}>
        <CamButton icon="back" label="Back to the menu" onPress={onBack} />
        <PressableScale onPress={() => void capture()} disabled={busy || !live || !granted} scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Take photo">
          <DarkGlass style={{ width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: "#FFFFFF", opacity: busy ? 0.6 : 1 }} />
          </DarkGlass>
        </PressableScale>
        <CamButton
          icon={more ? "close" : "more"}
          label={more ? "Fewer options" : "More options"}
          onPress={() => {
            haptic.selection();
            setMore((v) => !v);
          }}
        />
      </View>
    </View>
  );
}
