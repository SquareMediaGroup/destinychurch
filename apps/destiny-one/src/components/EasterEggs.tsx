// Small hidden touches for people to stumble on. All purely cosmetic (App
// Store guideline 2.3.1): none of them unlocks a feature, changes data or
// talks to the server, and every one is described in the App Review notes.
//
//   - Profile: press and hold your picture for Psalm 139:14.
//   - Chats: a line under the title on Easter Day ("He is risen!"), Pentecost
//     and Christmas Day, worked out on the phone from the date.
//
// Built on React Native's own Animated, so no new native module.

import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

const SHOW_MS = 3200;

/** A line that fades in, stays a few seconds and fades out. Read out by VoiceOver too. */
function useWhisper() {
  const [text, setText] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function show(line: string) {
    if (timer.current) clearTimeout(timer.current);
    setText(line);
    AccessibilityInfo.announceForAccessibility(line);
    Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 420, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setText(null);
      });
    }, SHOW_MS);
  }

  return { text, opacity, show };
}

// ── Press and hold your picture ─────────────────────────────────────────────

/**
 * For Profile: `onLongPress` goes on the picture, and `node` anywhere in the
 * screen (it floats above the tab bar, so it doesn't move anything).
 */
export function useFearfullyMade() {
  const insets = useSafeAreaInsets();
  const whisper = useWhisper();

  function onLongPress() {
    haptic.press();
    whisper.show("Fearfully and wonderfully made. Psalm 139:14");
  }

  const node = whisper.text ? (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 96, alignItems: "center", opacity: whisper.opacity }}>
      <Text style={{ overflow: "hidden", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "rgba(40,40,40,0.92)", color: "#FFF", fontSize: 14, maxWidth: 320, textAlign: "center" }}>{whisper.text}</Text>
    </Animated.View>
  ) : null;

  return { onLongPress, node };
}

// ── Seasonal line under the Chats title ─────────────────────────────────────

/** Easter Day in the Western calendar (the Anonymous Gregorian algorithm), as a local date. */
export function easterDay(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** The line for today, or null on an ordinary day. */
export function seasonalGreeting(now = new Date()): string | null {
  const easter = easterDay(now.getFullYear());
  const pentecost = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 49);
  if (sameDay(now, easter)) return "He is risen! Happy Easter.";
  if (sameDay(now, pentecost)) return "Happy Pentecost.";
  if (now.getMonth() === 11 && now.getDate() === 25) return "Happy Christmas.";
  return null;
}

/** Sits under the Chats large title. Renders nothing on an ordinary day. */
export function SeasonalGreeting() {
  const t = useTheme();
  const line = seasonalGreeting();
  if (!line) return null;
  return <Text style={{ paddingHorizontal: 20, marginTop: -4, paddingBottom: 8, fontSize: 15, color: t.muted }}>{line}</Text>;
}
