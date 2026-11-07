// An iOS-style segmented control: a raised "thumb" that slides between the
// segments on a spring, the way UISegmentedControl does, rather than the
// selection jumping from one segment to the next. Tap only (no dragging), so it
// never fights the swipe-back gesture. Screen readers get a radio group.

import { useEffect, useState } from "react";
import { Animated, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { reduceMotion } from "@/components/Motion";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

/** Quick and only just underdamped: the thumb lands with the faintest settle. */
const SLIDE = { stiffness: 420, damping: 34, mass: 1 } as const;

interface Props {
  options: readonly string[];
  index: number;
  onChange: (index: number) => void;
  /** Read out before each option ("Blur, Low"). */
  accessibilityLabel: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function Segmented({ options, index, onChange, accessibilityLabel, height = 32, style }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(index));
  const n = options.length;
  const seg = width > 0 ? (width - 4) / n : 0;

  useEffect(() => {
    if (reduceMotion()) x.setValue(index);
    else Animated.spring(x, { toValue: index, ...SLIDE, useNativeDriver: true }).start();
  }, [index, x]);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[{ flexDirection: "row", padding: 2, borderRadius: height / 2 + 2, backgroundColor: t.fill2 }, style]}
    >
      {seg > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", top: 2, left: 2, width: seg, height, borderRadius: height / 2, backgroundColor: t.dark ? "rgba(255,255,255,0.2)" : "#FFFFFF" },
            t.dark ? null : { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
            { transform: [{ translateX: x.interpolate({ inputRange: [0, Math.max(n - 1, 1)], outputRange: [0, seg * Math.max(n - 1, 1)] }) }] },
          ]}
        />
      ) : null}
      {options.map((name, i) => {
        const on = i === index;
        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${accessibilityLabel}, ${name}`}
            onPress={() => {
              if (on) return;
              haptic.selection();
              onChange(i);
            }}
            style={({ pressed }) => ({ flex: 1, height, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, opacity: pressed && !on ? 0.6 : 1 })}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3} style={{ fontSize: 13, fontWeight: on ? "600" : "500", letterSpacing: -0.1, color: on ? t.text : t.muted }}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
