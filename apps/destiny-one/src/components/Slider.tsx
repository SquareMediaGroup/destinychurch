// A plain horizontal slider (0 to 1), drawn with Views and dragged with a
// PanResponder, like the swipe gestures in Swipe.tsx: no extra native module.
// Screen readers get the standard "adjustable" control, so a swipe up or down
// changes the value in steps of 5%.

import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Text, View, type LayoutChangeEvent } from "react-native";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

const THUMB = 28;
const TRACK = 6;
const STEP = 0.05;

interface Props {
  label: string;
  /** Current value, 0 to 1. */
  value: number;
  onChange: (value: number) => void;
  /** What to show at the right of the label, e.g. "40%". */
  valueText: string;
}

export function Slider({ label, value, onChange, valueText }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  // The pan handlers are created once, so they read the latest props through a ref.
  const live = useRef({ width, onChange, value });
  useEffect(() => {
    live.current = { width, onChange, value };
  });
  const start = useRef(0);

  const travel = Math.max(1, width - THUMB);

  const pan = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- the refs are only read in the touch handlers, never during render
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Once dragging, keep it: the page behind is a scroll view and must not take over.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          // Tapping the track jumps the thumb there; grabbing the thumb itself doesn't move it.
          // (Every child ignores touches, so locationX is measured from the left of the whole control.)
          const target = clamp(
            (e.nativeEvent.locationX - THUMB / 2) /
              Math.max(1, live.current.width - THUMB),
          );
          const jump = Math.abs(target - live.current.value) > 0.06;
          if (jump) live.current.onChange(target);
          start.current = jump ? target : live.current.value;
          haptic.selection();
        },
        onPanResponderMove: (_, g) => {
          const next = clamp(
            start.current + g.dx / Math.max(1, live.current.width - THUMB),
          );
          if (next !== live.current.value) live.current.onChange(next);
        },
        onPanResponderRelease: () => haptic.selection(),
      }),
    [live, start],
  );

  const x = clamp(value) * travel;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 15, color: t.text }}>{label}</Text>
        <Text
          style={{
            fontSize: 15,
            color: t.muted,
            fontVariant: ["tabular-nums"],
          }}
        >
          {valueText}
        </Text>
      </View>
      <View
        {...pan.panHandlers}
        onLayout={(e: LayoutChangeEvent) =>
          setWidth(e.nativeEvent.layout.width)
        }
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(value * 100),
          text: valueText,
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) =>
          onChange(
            clamp(
              value + (e.nativeEvent.actionName === "increment" ? STEP : -STEP),
            ),
          )
        }
        style={{ height: 44, justifyContent: "center" }}
      >
        <View
          pointerEvents="none"
          style={{
            height: TRACK,
            borderRadius: TRACK / 2,
            backgroundColor: t.fill2,
            marginHorizontal: THUMB / 2,
          }}
        >
          <View
            style={{
              width: x,
              height: TRACK,
              borderRadius: TRACK / 2,
              backgroundColor: t.tint,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: x,
              width: THUMB,
              height: THUMB,
              borderRadius: THUMB / 2,
              backgroundColor: "#FFFFFF",
              borderWidth: 0.5,
              borderColor: "rgba(0,0,0,0.12)",
            },
            t.shadow,
          ]}
        />
      </View>
    </View>
  );
}
