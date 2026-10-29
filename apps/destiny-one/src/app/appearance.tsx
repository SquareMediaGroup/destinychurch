// D5 Appearance — the theme, the colour of the messages you send, and a
// wallpaper for your conversations: a stock photo, your own photo (dimmed and
// blurred to taste) or a pattern. Personal to this phone; nobody else sees any
// of it, and no photo is ever uploaded.
//
// The live preview at the top is drawn like a real chat (glass header and
// message box over the wallpaper), and answers every choice: a new wallpaper
// cross-fades in and settles, a new colour pops your bubbles.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Animated, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RING_GAP, SelectRing, ThemeModePicker, Tick } from "@/components/AppearancePicker";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { Tail, photoChip } from "@/components/MessageBubble";
import { Appear, Pop, PressableScale, animateLayout, reduceMotion } from "@/components/Motion";
import { PresetPicker } from "@/components/PresetPicker";
import { Segmented } from "@/components/Segmented";
import { Avatar, Card, FloatingBack, LargeTitle, Lead, TextButton } from "@/components/ui";
import { PhotoWallpaper, Wallpaper } from "@/components/Wallpaper";
import { customWallpaperUri, deleteCustomWallpaper, pickCustomWallpaper } from "@/lib/customWallpaper";
import { haptic } from "@/lib/haptics";
import { appearance, useAppearance } from "@/state/appearance";
import {
  BLUR_PRESETS,
  CUSTOM_WALLPAPER,
  DEFAULT_SEND_COLOUR,
  DEFAULT_WALLPAPER,
  DIM_PRESETS,
  PHOTO_WALLPAPERS,
  SEND_COLOURS,
  WALLPAPERS,
  isPhotoWallpaper,
  nearestPreset,
  sendColour,
  type LookKey,
  type WallpaperPattern,
  type WallpaperTone,
} from "@/theme/appearance";
import { photoFiles } from "@/theme/photoWallpapers";
import { useTheme } from "@/theme/tokens";

const WALL_TABS = ["Photos", "Patterns"] as const;
/** Wallpaper tiles are drawn at roughly a phone's shape. */
const TILE_ASPECT = 1.72;
const TILE_GAP = 12;

export default function AppearanceScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useAppearance();
  const scheme = lookOf(t.dark, current.mode);
  const isDefault = current.mode === "system" && current.sendColour === DEFAULT_SEND_COLOUR && current.wallpaper === DEFAULT_WALLPAPER;
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(isPhotoWallpaper(current.wallpaper) ? 0 : 1);
  const ownPhoto = customWallpaperUri(current.customFile);
  // "Your photo" is only in use while its file is still there.
  const onPhoto = isPhotoWallpaper(current.wallpaper) && (current.wallpaper !== CUSTOM_WALLPAPER || ownPhoto !== null);

  const { width: windowWidth } = useWindowDimensions();
  // Three across on a phone; more on a wide screen (the inside of a foldable), so tiles stay phone-sized.
  const gridWidth = Math.min(windowWidth, 900) - 32 - RING_GAP * 2;
  const columns = gridWidth > 560 ? 5 : 3;
  const tileWidth = Math.floor((gridWidth - TILE_GAP * (columns - 1)) / columns);

  /** Choose (or replace) your own photo and switch to it. The old file is deleted once the new one is in place. */
  async function choosePhoto() {
    if (busy) return;
    setBusy(true);
    try {
      const name = await pickCustomWallpaper();
      if (name) {
        const previous = appearance.get().customFile;
        appearance.set({ wallpaper: CUSTOM_WALLPAPER, customFile: name });
        deleteCustomWallpaper(previous);
        haptic.success();
      }
    } catch {
      Alert.alert("Couldn't use that photo", "Try a different one.");
    }
    setBusy(false);
  }

  function removePhoto() {
    Alert.alert("Remove your photo?", "It's deleted from this app. The original in your photo library isn't touched.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          animateLayout();
          deleteCustomWallpaper(current.customFile);
          appearance.set({ customFile: null, ...(current.wallpaper === CUSTOM_WALLPAPER ? { wallpaper: DEFAULT_WALLPAPER } : {}) });
        },
      },
    ]);
  }

  function reset() {
    Alert.alert("Reset appearance?", `Theme, message colour and wallpaper go back to how they started.${current.customFile ? " Your own photo is removed from this app." : ""}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          haptic.tick();
          animateLayout();
          deleteCustomWallpaper(current.customFile);
          appearance.reset();
        },
      },
    ]);
  }

  function pick(id: string) {
    if (id === current.wallpaper) return;
    haptic.selection();
    // The dim and blur card comes and goes with photos; let the page reflow smoothly around it.
    if (isPhotoWallpaper(id) !== onPhoto) animateLayout();
    appearance.set({ wallpaper: id });
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 28, width: "100%", maxWidth: 900, alignSelf: "center" }}>
        <View style={{ gap: 4, paddingHorizontal: 4 }}>
          <LargeTitle>Appearance</LargeTitle>
          <Lead style={{ fontSize: 15, lineHeight: 20 }}>Only you see these, and they stay on this phone.</Lead>
        </View>

        <Appear from={{ y: 18, scale: 0.98 }}>
          <Preview />
        </Appear>

        <Section title="Theme">
          <ThemeModePicker />
        </Section>

        <Section title="Your message colour" detail={sendColour(current.sendColour).label}>
          <Card style={{ paddingVertical: 16, paddingHorizontal: 14 }}>
            <View accessibilityRole="radiogroup" style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {SEND_COLOURS.map((c) => {
                const on = c.id === current.sendColour;
                return (
                  <PressableScale
                    key={c.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={c.label}
                    hitSlop={4}
                    scaleTo={0.86}
                    onPress={() => {
                      if (on) return;
                      haptic.selection();
                      appearance.set({ sendColour: c.id });
                    }}
                  >
                    <View style={{ width: 36, height: 36, margin: RING_GAP }}>
                      <View style={{ flex: 1, borderRadius: 18, backgroundColor: c[scheme].bg, alignItems: "center", justifyContent: "center" }}>
                        {on ? (
                          <Appear from={{ scale: 0.2 }}>
                            <Icon name="check" size={17} color={c[scheme].fg} strokeWidth={3.2} />
                          </Appear>
                        ) : null}
                      </View>
                      <SelectRing on={on} radius={18} color={c[scheme].bg} />
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </Card>
        </Section>

        <Section title="Chat wallpaper">
          <Segmented
            options={WALL_TABS}
            index={tab}
            accessibilityLabel="Wallpaper type"
            onChange={(i) => {
              animateLayout();
              setTab(i);
            }}
            style={{ marginHorizontal: 4, marginBottom: 6 }}
          />

          <Appear key={tab} from={{ y: 10 }}>
            {tab === 0 ? (
              <View style={{ gap: 14 }}>
                <Grid>
                  <WallTile
                    width={tileWidth}
                    label="Your photo"
                    accessibilityLabel={ownPhoto ? "Your own photo wallpaper" : "Choose your own photo for a wallpaper"}
                    on={current.wallpaper === CUSTOM_WALLPAPER && ownPhoto !== null}
                    onPress={() => (ownPhoto ? pick(CUSTOM_WALLPAPER) : void choosePhoto())}
                  >
                    {ownPhoto ? (
                      <Image source={{ uri: ownPhoto }} resizeMode="cover" accessible={false} style={StyleSheet.absoluteFill} />
                    ) : (
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.fill }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
                          {busy ? <ActivityIndicator color={t.tint} /> : <Icon name="plus" size={20} color={t.tint} strokeWidth={2.6} />}
                        </View>
                        <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: "500", color: t.muted }}>
                          {busy ? "Opening..." : "Choose"}
                        </Text>
                      </View>
                    )}
                  </WallTile>
                  {PHOTO_WALLPAPERS.map((p) => (
                    <WallTile key={p.id} width={tileWidth} label={p.label} accessibilityLabel={`${p.label} photo wallpaper`} on={p.id === current.wallpaper} onPress={() => pick(p.id)}>
                      <Image source={photoFiles(p.key)?.thumb} resizeMode="cover" accessible={false} fadeDuration={0} style={StyleSheet.absoluteFill} />
                    </WallTile>
                  ))}
                </Grid>

                {ownPhoto ? (
                  <View style={{ flexDirection: "row", justifyContent: "center", gap: 28 }}>
                    <TextButton label={busy ? "Opening..." : "Choose a different photo"} onPress={() => void choosePhoto()} />
                    <TextButton label="Remove" color={t.dark ? "#FF8A80" : "#C62828"} onPress={removePhoto} />
                  </View>
                ) : null}

                {onPhoto ? (
                  <Card style={{ padding: 16, gap: 16 }}>
                    <PresetPicker label={scheme !== "light" ? "Dim" : "Fade"} index={nearestPreset(DIM_PRESETS, current.dim)} onChange={(i) => appearance.set({ dim: DIM_PRESETS[i] })} />
                    <PresetPicker label="Blur" index={nearestPreset(BLUR_PRESETS, current.blur)} onChange={(i) => appearance.set({ blur: BLUR_PRESETS[i] })} />
                    <Text style={{ fontSize: 13, lineHeight: 18, color: t.subtle }}>
                      {scheme !== "light" ? "Dimming" : "Fading"} and blurring make messages easier to read over a busy photo.
                    </Text>
                  </Card>
                ) : null}

                <Text style={{ paddingHorizontal: 16, fontSize: 12, color: t.subtle, textAlign: "center" }}>Photos from Unsplash.</Text>
              </View>
            ) : (
              <Grid>
                {WALLPAPERS.map((w) => (
                  <WallTile key={w.id} width={tileWidth} label={w.label} accessibilityLabel={`${w.label} wallpaper`} on={w.id === current.wallpaper} onPress={() => pick(w.id)} background={w[scheme].stops[0]}>
                    <Wallpaper pattern={w.pattern} tone={w[scheme]} />
                  </WallTile>
                ))}
              </Grid>
            )}
          </Appear>
        </Section>

        {!isDefault ? (
          <Appear from={{ y: 8 }} style={{ alignItems: "center" }}>
            <TextButton label="Reset to default" onPress={reset} />
          </Appear>
        ) : null}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}

/** Which of the three looks is showing right now: True dark only when chosen. */
function lookOf(dark: boolean, mode: string): LookKey {
  return !dark ? "light" : mode === "black" ? "black" : "dark";
}

function Section({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 16 }}>
        <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: "600", color: t.muted }}>
          {title}
        </Text>
        {detail ? <Text style={{ fontSize: 13, color: t.subtle }}>{detail}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", columnGap: TILE_GAP, rowGap: 16, padding: RING_GAP }}>
      {children}
    </View>
  );
}

/** One wallpaper choice: a phone-shaped tile with a caption, a springing ring and a tick when selected. */
function WallTile({ width, label, accessibilityLabel, on, onPress, background, children }: { width: number; label: string; accessibilityLabel: string; on: boolean; onPress: () => void; background?: string; children: ReactNode }) {
  const t = useTheme();
  const radius = 14;
  return (
    <PressableScale accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={accessibilityLabel} scaleTo={0.95} onPress={onPress} style={{ width, gap: 7, alignItems: "center" }}>
      <View style={{ width, height: Math.round(width * TILE_ASPECT) }}>
        <View style={{ flex: 1, borderRadius: radius, overflow: "hidden", backgroundColor: background ?? t.fill, borderWidth: StyleSheet.hairlineWidth, borderColor: t.sep }}>{children}</View>
        <SelectRing on={on} radius={radius} />
        {on ? <Tick /> : null}
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ fontSize: 13, fontWeight: on ? "600" : "400", color: on ? t.text : t.muted }}>
        {label}
      </Text>
    </PressableScale>
  );
}

// ── Live preview ────────────────────────────────────────────────────────────

type Look = { kind: "photo"; source: ImageSourcePropType; dim: number; blur: number } | { kind: "pattern"; pattern: WallpaperPattern; tone: WallpaperTone } | { kind: "plain" };

function WallLayer({ look }: { look: Look }) {
  if (look.kind === "photo") return <PhotoWallpaper source={look.source} dim={look.dim} blur={look.blur} />;
  if (look.kind === "pattern") return <Wallpaper pattern={look.pattern} tone={look.tone} />;
  return null;
}

/**
 * A wallpaper that has just been chosen: it fades in over the old one and
 * settles from slightly larger, like picking a Lock Screen wallpaper. When it
 * has landed, the layers under it are dropped.
 */
function Arriving({ id, first, onLanded, children }: { id: string; first: boolean; onLanded: (id: string) => void; children: ReactNode }) {
  const [p] = useState(() => new Animated.Value(first ? 1 : 0));
  useEffect(() => {
    if (first) return;
    const anim = reduceMotion() ? Animated.timing(p, { toValue: 1, duration: 200, useNativeDriver: true }) : Animated.spring(p, { toValue: 1, stiffness: 170, damping: 26, mass: 1, useNativeDriver: true });
    anim.start(({ finished }) => finished && onLanded(id));
    return () => anim.stop();
  }, [first, id, onLanded, p]);
  const scale = reduceMotion() ? 1 : p.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 1], extrapolate: "clamp" }), transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

function sameLook(a: Look, b: Look): boolean {
  if (a.kind === "photo" && b.kind === "photo") return a.source === b.source && a.dim === b.dim && a.blur === b.blur;
  if (a.kind === "pattern" && b.kind === "pattern") return a.pattern === b.pattern && a.tone === b.tone;
  return a.kind === b.kind;
}

/** A small stand-in conversation, drawn with the same bubbles, glass and chips as the real one. */
function Preview() {
  const t = useTheme();
  const current = useAppearance();
  const look: Look = t.photo ? { kind: "photo", ...t.photo } : t.wall ? { kind: "pattern", pattern: t.wall.def.pattern, tone: t.wall.tone } : { kind: "plain" };
  const key = `${current.wallpaper}|${current.wallpaper === CUSTOM_WALLPAPER ? current.customFile : ""}|${lookOf(t.dark, current.mode)}`;

  // The wallpapers on screen, oldest first; the newest is the one chosen now. Each keeps the
  // look it last had, so one that's fading out doesn't change underneath the new one.
  const [layers, setLayers] = useState<{ key: string; look: Look; first: boolean }[]>(() => [{ key, look, first: true }]);
  const top = layers[layers.length - 1];
  if (top.key !== key) setLayers([...layers.filter((l) => l.key !== key).slice(-1), { key, look, first: false }]);
  else if (!sameLook(top.look, look)) setLayers([...layers.slice(0, -1), { ...top, look }]);
  // Once the newest has landed, everything under it can go.
  const landed = useCallback((id: string) => setLayers((ls) => (ls[ls.length - 1].key === id ? ls.slice(-1) : ls)), []);

  const bubble = { fontSize: 16, lineHeight: 21, letterSpacing: -0.2 } as const;
  return (
    <View
      accessible
      accessibilityLabel="Preview of a conversation with your choices"
      style={[{ height: 400, borderRadius: 30, overflow: "hidden", backgroundColor: t.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: t.sep }, t.shadow]}
    >
      {layers.map((l) => (
        <Arriving key={l.key} id={l.key} first={l.first} onLanded={landed}>
          <WallLayer look={l.look} />
        </Arriving>
      ))}

      <View style={{ position: "absolute", top: 14, left: 0, right: 0, alignItems: "center" }}>
        <GlassSurface style={[{ height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 9, paddingLeft: 6, paddingRight: 16 }, t.shadow]}>
          <Avatar name="Sunday Team" size={32} />
          <View>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 14, fontWeight: "600", color: t.text }}>
              Sunday Team
            </Text>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, color: t.muted }}>
              Ann, Sam and 10 others
            </Text>
          </View>
        </GlassSurface>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", gap: 5, paddingHorizontal: 16, paddingTop: 70, paddingBottom: 74 }}>
        <Text maxFontSizeMultiplier={1.2} style={[{ alignSelf: "center", fontSize: 12, fontWeight: "600", color: t.muted, marginBottom: 6 }, photoChip(t)]}>
          Today
        </Text>
        <View style={{ alignItems: "flex-start" }}>
          <View style={{ borderRadius: 19, borderBottomLeftRadius: 6, backgroundColor: t.bubbleIn, paddingVertical: 7, paddingHorizontal: 13, marginLeft: 10, maxWidth: "78%" }}>
            <Text maxFontSizeMultiplier={1.2} style={[bubble, { color: t.text }]}>Are you coming on Sunday?</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-start" }}>
          <View style={{ borderRadius: 19, borderTopLeftRadius: 6, borderBottomLeftRadius: 0, backgroundColor: t.bubbleIn, paddingVertical: 7, paddingHorizontal: 13, marginLeft: 10, maxWidth: "78%" }}>
            <Text maxFontSizeMultiplier={1.2} style={[bubble, { color: t.text }]}>Doors open at 10</Text>
            <Tail color={t.bubbleIn} mine={false} />
          </View>
        </View>
        <Pop value={current.sendColour} style={{ alignItems: "flex-end", gap: 5, marginTop: 6 }}>
          <View style={{ borderRadius: 19, borderBottomRightRadius: 6, backgroundColor: t.send, paddingVertical: 7, paddingHorizontal: 13, marginRight: 10, maxWidth: "78%" }}>
            <Text maxFontSizeMultiplier={1.2} style={[bubble, { color: t.onSend }]}>Yes, see you there</Text>
          </View>
          <View style={{ borderRadius: 19, borderTopRightRadius: 6, borderBottomRightRadius: 0, backgroundColor: t.send, paddingVertical: 7, paddingHorizontal: 13, marginRight: 10, maxWidth: "78%" }}>
            <Text maxFontSizeMultiplier={1.2} style={[bubble, { color: t.onSend }]}>I&apos;ll bring the coffee</Text>
            <Tail color={t.send} mine />
          </View>
        </Pop>
        <Text maxFontSizeMultiplier={1.2} style={[{ alignSelf: "flex-end", marginRight: 6, paddingTop: 2, fontSize: 11, color: t.muted }, photoChip(t)]}>
          Read 10:42
        </Text>
      </View>

      <View style={{ position: "absolute", left: 12, right: 12, bottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <GlassSurface style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
          <Icon name="plus" size={20} color={t.text} strokeWidth={2.2} />
        </GlassSurface>
        <GlassSurface style={{ flex: 1, height: 40, borderRadius: 20, justifyContent: "center", paddingHorizontal: 16 }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 16, color: t.subtle }}>
            Message
          </Text>
        </GlassSurface>
      </View>
    </View>
  );
}
