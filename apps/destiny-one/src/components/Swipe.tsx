// Two swipe gestures, built the way Apple's fluid-interface guidance asks:
// the content tracks the finger 1:1, resists softly at the edge (rubber
// band), and on release springs on from the finger's own velocity, so there
// is no seam between the drag and the animation. Both can be grabbed
// mid-flight.
//
//   SwipeToReply  drag a message LEFT (as in Telegram); at the threshold a tick
//                 plays and letting go replies. It never moves the message far.
//                 Left, not right, so it can never clash with swipe-back.
//   SwipeActions  drag a chat row left to reveal buttons (Read, Mute). It
//                 snaps open or shut using where the flick was heading, not
//                 just where the finger let go.
//
// Plain PanResponder + Animated (no extra native module). Not run on the
// native driver, because the drag itself sets the value every frame.
//
// Both claim the touch in the *capture* phase once the movement is clearly
// horizontal. Bubbles, buttons and the list are all touchable children, and a
// parent can only take a touch from them by capturing it.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, Text, View, type GestureResponderEvent, type PanResponderGestureState } from "react-native";
import { Icon, type IconName } from "@/components/Icon";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

/** Where a flick at `velocity` (px per second) would come to rest, with scroll-like deceleration. */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past an edge: the further you pull, the less it follows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * A rightward drag that starts this close to the left edge is the system back gesture.
 * PanResponder's own `x0` is only filled in once the gesture is claimed, so
 * while deciding whether to claim it, work out where the finger started.
 */
const EDGE = 28;
function startX(e: GestureResponderEvent, g: PanResponderGestureState): number {
  return e.nativeEvent.pageX - g.dx;
}

// Critically damped (no bounce), the default for things that didn't carry momentum.
const SETTLE = { stiffness: 320, damping: 36, mass: 1, useNativeDriver: false } as const;

// ── Swipe a message left to reply ───────────────────────────────────────────

const REPLY_THRESHOLD = 56;

export function SwipeToReply({ children, onReply, enabled = true }: { children: ReactNode; onReply: () => void; enabled?: boolean }) {
  const t = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const crossed = useRef(false);
  const onReplyRef = useRef(onReply);
  useEffect(() => {
    onReplyRef.current = onReply;
  }, [onReply]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Leftward and mostly horizontal.
        onMoveShouldSetPanResponderCapture: (_e, g) => enabled && g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          const d = Math.max(0, -g.dx);
          const shown = d <= REPLY_THRESHOLD ? d : REPLY_THRESHOLD + rubberband(d - REPLY_THRESHOLD, 80);
          x.setValue(-shown);
          if (!crossed.current && d >= REPLY_THRESHOLD) {
            crossed.current = true;
            haptic.tick();
          } else if (crossed.current && d < REPLY_THRESHOLD - 8) {
            crossed.current = false; // pulled back: it can tick again
          }
        },
        onPanResponderRelease: (_e, g) => {
          const fire = crossed.current;
          crossed.current = false;
          Animated.spring(x, { toValue: 0, velocity: g.vx, ...SETTLE }).start();
          if (fire) onReplyRef.current();
        },
        onPanResponderTerminate: () => {
          crossed.current = false;
          Animated.spring(x, { toValue: 0, ...SETTLE }).start();
        },
      }),
    [enabled, x],
  );

  const iconOpacity = x.interpolate({ inputRange: [-REPLY_THRESHOLD, -8], outputRange: [1, 0], extrapolate: "clamp" });
  const iconScale = x.interpolate({ inputRange: [-REPLY_THRESHOLD - 30, -REPLY_THRESHOLD, -8], outputRange: [1.12, 1, 0.5], extrapolate: "clamp" });

  return (
    <View {...responder.panHandlers}>
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", right: 12, top: 0, bottom: 0, width: 32, alignItems: "center", justifyContent: "center", opacity: iconOpacity, transform: [{ scale: iconScale }] }}
      >
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.fill2, alignItems: "center", justifyContent: "center" }}>
          <Icon name="reply" size={16} color={t.text} strokeWidth={2.2} />
        </View>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>
    </View>
  );
}

// ── Swipe a chat row left for actions ───────────────────────────────────────

export interface SwipeAction {
  key: string;
  label: string;
  icon: IconName;
  /** Background. Pick one that gives the white label at least 4.5:1. */
  bg: string;
  onPress: () => void;
}

const ACTION_WIDTH = 78;

// Only one row is open at a time.
let openRow: { close: () => void } | null = null;

export function SwipeActions({ children, actions, background }: { children: ReactNode; actions: SwipeAction[]; background: string }) {
  const total = ACTION_WIDTH * actions.length;
  const [x] = useState(() => new Animated.Value(0));
  const me = useRef({ close: () => {} });
  const pos = useRef(0);
  const start = useRef(0);
  const [open, setOpen] = useState(false);
  const isOpen = useRef(false);

  useEffect(() => {
    const id = x.addListener(({ value }) => {
      pos.current = value;
    });
    return () => x.removeListener(id);
  }, [x]);

  const settle = useCallback(
    (to: number, velocity = 0) => {
      Animated.spring(x, { toValue: to, velocity, ...SETTLE }).start();
      const nowOpen = to !== 0;
      if (nowOpen && !isOpen.current) haptic.tick();
      isOpen.current = nowOpen;
      setOpen(nowOpen);
      if (nowOpen) {
        if (openRow && openRow !== me.current) openRow.close();
        openRow = me.current;
      } else if (openRow === me.current) {
        openRow = null;
      }
    },
    [x],
  );

  useEffect(() => {
    const handle = me.current;
    handle.close = () => settle(0);
    return () => {
      if (openRow === handle) openRow = null;
    };
  }, [settle]);
  const close = useCallback(() => settle(0), [settle]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6 && (g.dx < 0 || startX(e, g) > EDGE),
        onPanResponderGrant: () => {
          x.stopAnimation(); // grab it mid-flight: carry on from where it is on screen
          start.current = pos.current;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => {
          const raw = start.current + g.dx;
          // 1:1 inside the range; resist softly past either end.
          const v = raw < -total ? -total - rubberband(-total - raw, 90) : raw > 0 ? rubberband(raw, 90) : raw;
          x.setValue(v);
        },
        onPanResponderRelease: (_e, g) => {
          const projected = pos.current + project(g.vx * 1000);
          settle(projected < -total / 2 ? -total : 0, g.vx);
        },
        onPanResponderTerminate: () => settle(pos.current < -total / 2 ? -total : 0),
      }),
    [settle, total, x],
  );

  return (
    <View style={{ overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: total, flexDirection: "row" }}>
        {actions.map((a) => (
          <Pressable
            key={a.key}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={() => {
              haptic.selection();
              close();
              a.onPress();
            }}
            style={({ pressed }) => ({ width: ACTION_WIDTH, backgroundColor: a.bg, alignItems: "center", justifyContent: "center", gap: 4, opacity: pressed ? 0.85 : 1 })}
          >
            <Icon name={a.icon} size={22} color="#FFFFFF" strokeWidth={2} />
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: "600", color: "#FFFFFF" }}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View {...responder.panHandlers}>
        <Animated.View style={{ backgroundColor: background, transform: [{ translateX: x }] }}>
          {children}
          {open ? <Pressable accessibilityLabel="Close actions" onPress={close} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} /> : null}
        </Animated.View>
      </View>
    </View>
  );
}
