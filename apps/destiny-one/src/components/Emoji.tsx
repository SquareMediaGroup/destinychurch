/**
 * An emoji that stays sharp while an ancestor animates its scale.
 *
 * Apple Color Emoji are bitmaps, and a native-driven scale transform stretches
 * the bitmap drawn at rest size, so anything that scales past 1 (a press-grow,
 * a spring overshoot) goes soft until the animation ends. This draws the glyph
 * at SUPERSAMPLE x its size and shrinks it back with a static transform, so the
 * bitmap has headroom: ancestors can scale up to SUPERSAMPLE x without blurring.
 * The outer box keeps the layout at the size the caller asked for.
 */
import { Text, View } from "react-native";

const SUPERSAMPLE = 1.4;

type EmojiProps = {
  children: string;
  /** Visual font size in points. */
  size: number;
  allowFontScaling?: boolean;
  maxFontSizeMultiplier?: number;
};

export function Emoji({ children, size, allowFontScaling = false, maxFontSizeMultiplier }: EmojiProps) {
  const box = Math.round(size * 1.3);
  const big = box * SUPERSAMPLE;
  return (
    <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }}>
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={{ width: big, height: big, fontSize: size * SUPERSAMPLE, lineHeight: big, textAlign: "center", transform: [{ scale: 1 / SUPERSAMPLE }] }}
      >
        {children}
      </Text>
    </View>
  );
}
