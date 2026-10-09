// D5 Appearance — pick the colour of the messages you send and a wallpaper
// for your conversations: a pattern, one of the stock photos, or your own photo
// (dimmed and blurred to taste). Personal to this phone; nobody else sees any
// of it, and no photo is ever uploaded. A live preview at the top updates as
// you choose.

import { useState, type ReactNode } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Tail, photoChip } from "@/components/MessageBubble";
import { Slider } from "@/components/Slider";
import { Card, FloatingBack, LargeTitle, SectionLabel, TextButton } from "@/components/ui";
import { Backdrop, Wallpaper } from "@/components/Wallpaper";
import { customWallpaperUri, deleteCustomWallpaper, pickCustomWallpaper } from "@/lib/customWallpaper";
import { haptic } from "@/lib/haptics";
import { appearance, useAppearance, type ThemeMode } from "@/state/appearance";
import { CUSTOM_WALLPAPER, DEFAULT_SEND_COLOUR, DEFAULT_WALLPAPER, MAX_DIM, PAGE_BG, PHOTO_WALLPAPERS, SEND_COLOURS, WALLPAPERS, isPhotoWallpaper, type LookKey } from "@/theme/appearance";
import { photoFiles } from "@/theme/photoWallpapers";
import { useTheme } from "@/theme/tokens";

const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "black", label: "True dark" },
];

const THUMB_W = 96;
const THUMB_H = 150;

export default function AppearanceScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const current = useAppearance();
  const systemDark = useColorScheme() === "dark";
  // Which of the three looks is showing right now: True dark only when chosen.
  const scheme: LookKey = !systemDark ? "light" : current.mode === "black" ? "black" : "dark";
  const isDefault = current.mode === "system" && current.sendColour === DEFAULT_SEND_COLOUR && current.wallpaper === DEFAULT_WALLPAPER;
  const [busy, setBusy] = useState(false);
  const ownPhoto = customWallpaperUri(current.customFile);
  // "Your photo" is only in use while its file is still there.
  const onPhoto = isPhotoWallpaper(current.wallpaper) && (current.wallpaper !== CUSTOM_WALLPAPER || ownPhoto !== null);

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
        haptic.tick();
      }
    } catch {
      Alert.alert("Couldn't use that photo", "Try a different one.");
    }
    setBusy(false);
  }

  function removePhoto() {
    deleteCustomWallpaper(current.customFile);
    appearance.set({ customFile: null, ...(current.wallpaper === CUSTOM_WALLPAPER ? { wallpaper: DEFAULT_WALLPAPER } : {}) });
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 48, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>Appearance</LargeTitle>

        <Preview />

        <View style={{ gap: 8 }}>
          <SectionLabel>Theme</SectionLabel>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 12 }}>
            {MODE_OPTIONS.map((o) => {
              const on = o.key === current.mode;
              return (
                <Pressable
                  key={o.key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={o.key === "system" ? "System, matches your phone" : o.label}
                  onPress={() => {
                    if (!on) haptic.selection();
                    appearance.set({ mode: o.key });
                  }}
                  style={({ pressed }) => ({ flex: 1, gap: 6, alignItems: "center", transform: [{ scale: pressed ? 0.96 : 1 }] })}
                >
                  <View style={{ width: "100%", height: 84, borderRadius: 16, overflow: "hidden", flexDirection: "row", borderWidth: on ? 3 : 1, borderColor: on ? t.tint : t.sep }}>
                    {o.key === "system" || o.key === "light" ? <ModeSwatch look="light" /> : null}
                    {o.key === "system" || o.key === "dark" ? <ModeSwatch look="dark" /> : null}
                    {o.key === "black" ? <ModeSwatch look="black" /> : null}
                    {on ? (
                      <View style={{ position: "absolute", right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}>
                        <Icon name="check" size={13} color={t.dark ? "#0E1013" : "#FFFFFF"} strokeWidth={3.2} />
                      </View>
                    ) : null}
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: on ? "600" : "400", color: t.text }}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>Your message colour</SectionLabel>
          <Card style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }} accessibilityRole="radiogroup">
              {SEND_COLOURS.map((c) => {
                const on = c.id === current.sendColour;
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={c.label}
                    onPress={() => {
                      if (!on) haptic.selection();
                      appearance.set({ sendColour: c.id });
                    }}
                    style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, padding: 3, borderWidth: 2.5, borderColor: on ? t.text : "transparent", transform: [{ scale: pressed ? 0.92 : 1 }] })}
                  >
                    <View style={{ flex: 1, borderRadius: 21, backgroundColor: c[scheme].bg, alignItems: "center", justifyContent: "center" }}>
                      {on ? <Icon name="check" size={18} color={c[scheme].fg} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>Chat wallpaper</SectionLabel>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, color: t.subtle }}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingVertical: 4 }} accessibilityRole="radiogroup">
            <Tile
              label="Your photo"
              accessibilityLabel={ownPhoto ? "Your own photo wallpaper" : "Choose your own photo for a wallpaper"}
              on={current.wallpaper === CUSTOM_WALLPAPER && ownPhoto !== null}
              onPress={() => {
                if (!ownPhoto) return void choosePhoto();
                if (current.wallpaper !== CUSTOM_WALLPAPER) haptic.selection();
                appearance.set({ wallpaper: CUSTOM_WALLPAPER });
              }}
            >
              {ownPhoto ? (
                <Image source={{ uri: ownPhoto }} resizeMode="cover" accessible={false} style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: t.fill }}>
                  <Icon name={busy ? "photo" : "plus"} size={22} color={t.tint} strokeWidth={2.4} />
                  <Text style={{ fontSize: 12, color: t.muted }}>{busy ? "Working..." : "Choose"}</Text>
                </View>
              )}
            </Tile>
            {PHOTO_WALLPAPERS.map((p) => (
              <Tile
                key={p.id}
                label={p.label}
                accessibilityLabel={`${p.label} photo wallpaper`}
                on={p.id === current.wallpaper}
                onPress={() => {
                  if (p.id !== current.wallpaper) haptic.selection();
                  appearance.set({ wallpaper: p.id });
                }}
              >
                <Image source={photoFiles(p.key)?.thumb} resizeMode="cover" accessible={false} style={{ width: "100%", height: "100%" }} />
              </Tile>
            ))}
          </ScrollView>
          <Text style={{ paddingHorizontal: 16, fontSize: 12, color: t.subtle }}>Photos from Unsplash. They stay on this phone.</Text>

          {ownPhoto ? (
            <View style={{ flexDirection: "row", gap: 24, paddingHorizontal: 16, paddingTop: 2 }}>
              <TextButton label={busy ? "Working..." : "Choose a different photo"} onPress={() => void choosePhoto()} />
              <TextButton label="Remove" color={t.dark ? "#FF8A80" : "#C62828"} onPress={removePhoto} />
            </View>
          ) : null}

          {onPhoto ? (
            <Card style={{ padding: 16, gap: 4, marginTop: 6 }}>
              <Slider
                label={scheme !== "light" ? "Dim" : "Fade"}
                value={current.dim / MAX_DIM}
                onChange={(v) => appearance.set({ dim: v * MAX_DIM })}
                valueText={`${Math.round(current.dim * 100)}%`}
              />
              <Slider label="Blur" value={current.blur} onChange={(v) => appearance.set({ blur: v })} valueText={`${Math.round(current.blur * 100)}%`} />
              <Text style={{ fontSize: 13, lineHeight: 18, color: t.subtle, paddingTop: 4 }}>
                {scheme !== "light" ? "Dimming" : "Fading"} and blurring make messages easier to read over a busy photo.
              </Text>
            </Card>
          ) : null}

          <Text style={{ paddingHorizontal: 16, paddingTop: 8, fontSize: 13, color: t.subtle }}>Patterns</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingVertical: 4 }} accessibilityRole="radiogroup">
            {WALLPAPERS.map((w) => {
              const wt = w[scheme];
              return (
                <Tile
                  key={w.id}
                  label={w.label}
                  accessibilityLabel={`${w.label} wallpaper`}
                  on={w.id === current.wallpaper}
                  onPress={() => {
                    if (w.id !== current.wallpaper) haptic.selection();
                    appearance.set({ wallpaper: w.id });
                  }}
                  background={wt.stops[0]}
                >
                  <Wallpaper pattern={w.pattern} tone={wt} />
                  {w.pattern === "none" ? (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 13, color: t.muted }}>None</Text>
                    </View>
                  ) : null}
                </Tile>
              );
            })}
          </ScrollView>
        </View>

        {!isDefault ? (
          <View style={{ alignItems: "center" }}>
            <TextButton
              label="Reset to default"
              onPress={() => {
                haptic.tick();
                deleteCustomWallpaper(current.customFile);
                appearance.reset();
              }}
            />
          </View>
        ) : null}
      </ScrollView>
      <FloatingBack background={t.grouped} />
    </View>
  );
}

/** One wallpaper choice: a portrait thumbnail with a caption and a tick when selected. */
function Tile({ label, accessibilityLabel, on, onPress, background, children }: { label: string; accessibilityLabel: string; on: boolean; onPress: () => void; background?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ gap: 6, alignItems: "center", transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <View style={{ width: THUMB_W, height: THUMB_H, borderRadius: 16, overflow: "hidden", borderWidth: on ? 3 : 1, borderColor: on ? t.tint : t.sep, backgroundColor: background ?? t.fill }}>
        {children}
        {on ? (
          <View style={{ position: "absolute", right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={13} color={t.dark ? "#0E1013" : "#FFFFFF"} strokeWidth={3.2} />
          </View>
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: on ? "600" : "400", color: t.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Half a tile: a few bubbles in one look's page colours. System shows light and dark side by side. */
const SWATCH_BUBBLE = { light: "#F3F3F4", dark: "#33241A", black: "#212125" } as const;
export function ModeSwatch({ look }: { look: LookKey }) {
  const dark = look !== "light";
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG[look], justifyContent: "center", gap: 5, paddingHorizontal: 8 }}>
      <View style={{ width: "70%", height: 12, borderRadius: 6, backgroundColor: SWATCH_BUBBLE[look] }} />
      <View style={{ width: "55%", height: 12, borderRadius: 6, backgroundColor: dark ? "#F58021" : "#BF5200", alignSelf: "flex-end" }} />
    </View>
  );
}

/** A small stand-in conversation, drawn with the same bubble shapes as the real one. */
function Preview() {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel="Preview of a conversation" style={{ height: 250, borderRadius: 24, overflow: "hidden", backgroundColor: t.bg, borderWidth: 1, borderColor: t.sep }}>
      <Backdrop />
      <View style={{ flex: 1, justifyContent: "center", gap: 6, paddingHorizontal: 18 }}>
        <View style={{ alignItems: "flex-start" }}>
          <View style={{ borderRadius: 20, borderBottomLeftRadius: 0, backgroundColor: t.bubbleIn, paddingVertical: 8, paddingHorizontal: 14, marginLeft: 10 }}>
            <Text style={{ fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: t.text }}>Are you coming on Sunday?</Text>
            <Tail color={t.bubbleIn} mine={false} />
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ borderRadius: 20, borderTopRightRadius: 6, borderBottomRightRadius: 6, backgroundColor: t.send, paddingVertical: 8, paddingHorizontal: 14, marginRight: 10 }}>
            <Text style={{ fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: t.onSend }}>Yes, see you there</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ borderRadius: 20, borderTopRightRadius: 6, borderBottomRightRadius: 0, backgroundColor: t.send, paddingVertical: 8, paddingHorizontal: 14, marginRight: 10 }}>
            <Text style={{ fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: t.onSend }}>I&apos;ll bring the coffee</Text>
            <Tail color={t.send} mine />
          </View>
          <Text style={[{ paddingHorizontal: 16, paddingTop: 3, fontSize: 11, color: t.muted }, photoChip(t)]}>10:42</Text>
        </View>
      </View>
    </View>
  );
}
