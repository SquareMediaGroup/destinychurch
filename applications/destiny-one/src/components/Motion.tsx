// Motion primitives shared across the app, built on React Native's own
// Animated (native driver, so they run off the JS thread) — no extra native
// module, so none of this needs a new binary.
//
// The feel follows Apple's fluid-interface guidance:
//   - Springs, not durations. Things settle rather than stop on a timer.
//   - Press responds instantly (a stiff, damped spring down) and releases
//     with a little life (a softer spring back up, with a touch of bounce).
//   - Everything is interruptible: a new target just retargets the spring.
//   - Reduce Motion is respected: movement is dropped, fades stay short.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { haptic, type HapticKind } from "@/lib/haptics";

// ── Reduce Motion ───────────────────────────────────────────────────────────

let reduced = false;
void AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduced = v;
  })
  .catch(() => undefined);
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
  reduced = v;
});

/** True when the person has Reduce Motion on. Read at animation time, so a change applies at once. */
export function reduceMotion(): boolean {
  return reduced;
}

// ── Springs ─────────────────────────────────────────────────────────────────

export const springs = {
  /** Finger down: quick, no overshoot. */
  press: { stiffness: 600, damping: 38, mass: 1 },
  /** Finger up: back to rest with a small bounce. */
  release: { stiffness: 340, damping: 17, mass: 1 },
  /** Something arriving on screen. */
  enter: { stiffness: 240, damping: 24, mass: 1 },
  /** A badge or count changing: a lively pop. */
  pop: { stiffness: 480, damping: 13, mass: 0.8 },
} as const;

/**
 * Animate the next layout change (items appearing, filtering, a bar growing)
 * with a gentle spring. Call just before the state update that causes it.
 */
export function animateLayout() {
  if (reduced) return;
  LayoutAnimation.configureNext({
    duration: 380,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration: 220 },
    update: { type: LayoutAnimation.Types.spring, springDamping: 0.82 },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity, duration: 180 },
  });
}

// ── Pressable that springs ──────────────────────────────────────────────────

type PressableScaleProps = PressableProps & {
  /** How far it shrinks under the finger. */
  scaleTo?: number;
  /** A haptic to play when the press lands. */
  feedback?: HapticKind;
  /**
   * Shrink over this many ms instead of snapping down: for long-press targets,
   * so the squeeze "charges" towards the menu opening.
   */
  holdMs?: number;
  /** Layout for the animated wrapper (flex, alignSelf, margins), since the transform lives there. */
  wrapStyle?: StyleProp<ViewStyle>;
};

/**
 * A Pressable that shrinks under the finger and springs back when released.
 * The scale is on a wrapper, so the Pressable's own style (including the
 * `({ pressed }) => …` form) works as usual.
 */
export function PressableScale({ scaleTo = 0.96, feedback, holdMs, wrapStyle, onPressIn, onPressOut, onPress, ...rest }: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));
  return (
    <Animated.View style={[wrapStyle, { transform: [{ scale }] }]}>
      <Pressable
        {...rest}
        onPressIn={(e) => {
          if (!reduced) {
            if (holdMs) Animated.timing(scale, { toValue: scaleTo, duration: holdMs, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
            else Animated.spring(scale, { toValue: scaleTo, ...springs.press, useNativeDriver: true }).start();
          }
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          Animated.spring(scale, { toValue: 1, ...springs.release, useNativeDriver: true }).start();
          onPressOut?.(e);
        }}
        onPress={(e) => {
          if (feedback) haptic[feedback]();
          onPress?.(e);
        }}
      />
    </Animated.View>
  );
}

// ── Entrances ───────────────────────────────────────────────────────────────

// Keys that have already made their entrance. A list recycles its cells as you
// scroll, and a row coming back into view shouldn't arrive a second time.
const entered = new Set<string>();

/**
 * Fades and springs its children into place when first mounted.
 *
 * `once`: a stable key; the entrance plays only the first time that key is
 * seen in this app session. `from`: where it starts relative to rest.
 */
export function Appear({
  children,
  delay = 0,
  from = { y: 12 },
  once,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: { x?: number; y?: number; scale?: number };
  once?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [skip] = useState(() => (once ? entered.has(once) : false));
  const [p] = useState(() => new Animated.Value(skip ? 1 : 0));

  useEffect(() => {
    if (skip) return;
    if (once) entered.add(once);
    if (reduced) {
      Animated.timing(p, { toValue: 1, duration: 150, delay, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(p, { toValue: 1, delay, ...springs.enter, useNativeDriver: true }).start();
  }, [skip, once, delay, p]);

  const move = !reduced && !skip;
  const opacity = p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: "clamp" });
  const transform = move
    ? [
        { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [from.x ?? 0, 0] }) },
        { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [from.y ?? 0, 0] }) },
        { scale: p.interpolate({ inputRange: [0, 1], outputRange: [from.scale ?? 1, 1] }) },
      ]
    : [];
  return <Animated.View style={[style, { opacity, transform }]}>{children}</Animated.View>;
}

/** Marks a key as already entered, so an Appear with it renders in place. */
export function markEntered(key: string) {
  entered.add(key);
}

// ── Reactions to change ─────────────────────────────────────────────────────

/** Pops (scales up and settles) whenever `value` changes after the first render. */
export function Pop({ value, children, style }: { value: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [scale] = useState(() => new Animated.Value(1));
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, ...springs.pop, useNativeDriver: true }).start();
  }, [value, scale]);
  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}

/** Shakes side to side (a "no") whenever `trigger` changes to something truthy. */
export function Shake({ trigger, children, style }: { trigger: unknown; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [x] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!trigger || reduced) return;
    x.setValue(0);
    const step = (to: number, duration: number) => Animated.timing(x, { toValue: to, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    Animated.sequence([step(9, 50), step(-8, 70), step(6, 70), step(-4, 60), step(2, 50), step(0, 50)]).start();
  }, [trigger, x]);
  return <Animated.View style={[style, { transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}
