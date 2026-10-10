// DestinyAI's answer while it's being written (state/assistantStream.ts): what
// it's doing (animated dots and a label), then the words as they arrive with a
// blinking cursor. Sits where an incoming message from DestinyAI will land.

import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { Avatar } from "@/components/ui";
import { useTheme } from "@/theme/tokens";

export function AssistantStreaming({ label, text }: { label: string | null; text: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12, paddingTop: 12, paddingRight: 56, paddingLeft: 12 }}>
      <View style={{ width: 30, marginBottom: 2 }}>
        <Avatar name="DestinyAI" size={30} assistant />
      </View>
      <View style={{ flexShrink: 1, gap: 3, minWidth: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: t.muted, marginLeft: 4 }}>DestinyAI</Text>
        <View style={{ backgroundColor: t.card, borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, justifyContent: "center" }}>
          {text ? (
            <Text style={{ fontSize: 17, lineHeight: 23, color: t.text }}>
              {text}
              <Cursor />
            </Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Dots />
              <Text style={{ fontSize: 14, color: t.muted }}>{label ? `${label}…` : ""}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/** A thin bar that blinks at the end of the text while it arrives. */
function Cursor() {
  const t = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);
  return <Animated.Text style={{ opacity, color: t.tint }}>▍</Animated.Text>;
}

/** Three dots taking turns to brighten, shown while DestinyAI is still thinking. */
function Dots() {
  const t = useTheme();
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(phase, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [phase]);
  const input = [0, 0.33, 0.66, 1];
  const dot = (bright: number[]) => ({
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: t.muted,
    opacity: phase.interpolate({ inputRange: input, outputRange: bright }),
  });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Animated.View style={dot([1, 0.3, 0.3, 1])} />
      <Animated.View style={dot([0.3, 1, 0.3, 0.3])} />
      <Animated.View style={dot([0.3, 0.3, 1, 0.3])} />
    </View>
  );
}
