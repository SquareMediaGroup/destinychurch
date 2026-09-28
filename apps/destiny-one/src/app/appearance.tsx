// D5 Appearance — pick the colour of the messages you send and a wallpaper
// for your conversations. Personal to this phone; nobody else sees either.
// A live preview at the top updates as you choose.

import { Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Tail } from "@/components/MessageBubble";
import { Card, FloatingBack, LargeTitle, SectionLabel, TextButton } from "@/components/ui";
import { Wallpaper } from "@/components/Wallpaper";
import { haptic } from "@/lib/haptics";
import { appearance, useAppearance } from "@/state/appearance";
import { DEFAULT_SEND_COLOUR, DEFAULT_WALLPAPER, SEND_COLOURS, WALLPAPERS, contrast, sendColour } from "@/theme/appearance";
import { useTheme } from "@/theme/tokens";

const THUMB_W = 96;
const THUMB_H = 150;

export default function AppearanceScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const current = useAppearance();
  const chosen = sendColour(current.sendColour);
  const tone = chosen[scheme];
  const isDefault = current.sendColour === DEFAULT_SEND_COLOUR && current.wallpaper === DEFAULT_WALLPAPER;

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 16, paddingBottom: 48, gap: 22 }}>
        <LargeTitle style={{ paddingHorizontal: 4 }}>Appearance</LargeTitle>

        <Preview />

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
            <Text style={{ fontSize: 13, lineHeight: 18, color: t.muted }}>
              {chosen.label}. Text on it has {contrast(tone.bg, tone.fg).toFixed(1)} to 1 contrast, so it stays easy to read. Only you see your messages in this colour.
            </Text>
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>Chat wallpaper</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4, paddingVertical: 4 }} accessibilityRole="radiogroup">
            {WALLPAPERS.map((w) => {
              const on = w.id === current.wallpaper;
              const wt = w[scheme];
              return (
                <Pressable
                  key={w.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${w.label} wallpaper`}
                  onPress={() => {
                    if (!on) haptic.selection();
                    appearance.set({ wallpaper: w.id });
                  }}
                  style={({ pressed }) => ({ gap: 6, alignItems: "center", transform: [{ scale: pressed ? 0.96 : 1 }] })}
                >
                  <View style={{ width: THUMB_W, height: THUMB_H, borderRadius: 16, overflow: "hidden", borderWidth: on ? 3 : 1, borderColor: on ? t.tint : t.sep, backgroundColor: wt.stops[0] }}>
                    <Wallpaper pattern={w.pattern} tone={wt} />
                    {w.pattern === "none" ? (
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 13, color: t.muted }}>None</Text>
                      </View>
                    ) : null}
                    {on ? (
                      <View style={{ position: "absolute", right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}>
                        <Icon name="check" size={13} color={t.dark ? "#0E1013" : "#FFFFFF"} strokeWidth={3.2} />
                      </View>
                    ) : null}
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: on ? "600" : "400", color: t.text }}>
                    {w.label}
                  </Text>
                </Pressable>
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

/** A small stand-in conversation, drawn with the same bubble shapes as the real one. */
function Preview() {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel="Preview of a conversation" style={{ height: 250, borderRadius: 24, overflow: "hidden", backgroundColor: t.bg, borderWidth: 1, borderColor: t.sep }}>
      {t.wall ? <Wallpaper pattern={t.wall.def.pattern} tone={t.wall.tone} /> : null}
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
          <Text style={{ paddingHorizontal: 16, paddingTop: 3, fontSize: 11, color: t.muted }}>10:42</Text>
        </View>
      </View>
    </View>
  );
}
