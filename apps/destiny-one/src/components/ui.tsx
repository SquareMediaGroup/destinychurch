// Destiny One UI primitives, matching the Claude Design prototype.
//
// The signature element is the "beam": a rotating orange arc around primary
// buttons and focused fields. The prototype draws it with a CSS conic-gradient;
// React Native has none, so here a large linear gradient spins behind a
// rounded, clipped frame, which reads the same at 1.5px.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { D1_ROLE_LABELS, type D1LeaderRole } from "@destiny/shared";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { GlassSurface } from "@/components/GlassSurface";
import { LOGO_XML } from "@/components/logoXml";
import { Icon, type IconName } from "@/components/Icon";
import { ORANGE, ORANGE_LIGHT, useTheme, type Theme } from "@/theme/tokens";

// ── Beam ────────────────────────────────────────────────────────────────────

function useSpin(active: boolean, durationMs = 3200) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: durationMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active, durationMs, v]);
  return v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
}

/** A rounded frame with the rotating orange beam as its 1.5px border. */
export function Beam({
  children,
  radius,
  active = true,
  dim = "rgba(245,128,33,0.22)",
  style,
}: {
  children: ReactNode;
  radius: number;
  active?: boolean;
  dim?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [side, setSide] = useState(0);
  const rotate = useSpin(active);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSide(Math.ceil(Math.hypot(width, height)));
  };
  return (
    <View
      onLayout={onLayout}
      style={[
        { borderRadius: radius, padding: 1.5, overflow: "hidden" },
        active && { shadowColor: ORANGE, shadowOpacity: 0.45, shadowRadius: 9, shadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    >
      {active && side > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", width: side, height: side, left: "50%", top: "50%", marginLeft: -side / 2, marginTop: -side / 2, transform: [{ rotate }] }}
        >
          <LinearGradient
            colors={[dim, dim, ORANGE, ORANGE_LIGHT, dim]}
            locations={[0, 0.55, 0.78, 0.88, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryButton({ label, onPress, busy, disabled, style }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const off = disabled || busy;
  return (
    <Beam radius={999} active={!disabled} style={[{ opacity: disabled ? 0.4 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!off, busy: !!busy }}
        disabled={off}
        onPress={onPress}
        style={({ pressed }) => [styles.pill, { backgroundColor: t.btn, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        {busy ? <ActivityIndicator color={t.onBtn} /> : <Text style={[styles.pillText, { color: t.onBtn }]}>{label}</Text>}
      </Pressable>
    </Beam>
  );
}

export function SecondaryButton({ label, onPress, busy, style }: { label: string; onPress: () => void; busy?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, { backgroundColor: t.fill, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {busy ? <ActivityIndicator color={t.text} /> : <Text style={[styles.pillText, { color: t.text }]}>{label}</Text>}
    </Pressable>
  );
}

export function TextButton({ label, onPress, color, style }: { label: string; onPress: () => void; color?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }, style]}>
      <Text style={{ fontSize: 17, color: color ?? t.tint }}>{label}</Text>
    </Pressable>
  );
}

/** Round glass button used for back / close / search in the floating headers. */
export function GlassIconButton({ icon, label, onPress, size = 44 }: { icon: IconName; label: string; onPress: () => void; size?: number }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}>
      {({ pressed }) => (
        <GlassSurface interactive style={[{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] }, t.shadow]}>
          <Icon name={icon} size={icon === "close" ? 16 : 22} color={t.text} strokeWidth={icon === "close" ? 2.6 : 2.2} />
        </GlassSurface>
      )}
    </Pressable>
  );
}

export function BackButton({ icon = "back", onPress }: { icon?: "back" | "close"; onPress?: () => void }) {
  return <GlassIconButton icon={icon} label={icon === "close" ? "Close" : "Back"} onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))} />;
}

// ── Fields ──────────────────────────────────────────────────────────────────

/** A text field whose border lights up with the beam while focused. */
export function Field({
  radius = 16,
  background,
  leading,
  footer,
  inputStyle,
  containerStyle,
  ...input
}: TextInputProps & { radius?: number; background?: string; leading?: ReactNode; footer?: ReactNode; inputStyle?: StyleProp<TextStyle>; containerStyle?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Beam radius={radius} active={focused} dim="rgba(245,128,33,0.25)" style={[!focused && { padding: 1.5 }, containerStyle]}>
      <View style={{ borderRadius: radius - 1.5, backgroundColor: background ?? t.field, paddingHorizontal: 16, flexDirection: input.multiline ? "column" : "row", alignItems: input.multiline ? "stretch" : "center", gap: 10 }}>
        {leading}
        <TextInput
          placeholderTextColor={t.subtle}
          selectionColor={ORANGE}
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[{ flex: input.multiline ? undefined : 1, minHeight: 52, fontSize: 17, color: t.text }, input.multiline && { minHeight: 80, paddingTop: 14, textAlignVertical: "top" }, inputStyle]}
        />
        {footer}
      </View>
    </Beam>
  );
}

export function FieldLabel({ children, optional }: { children: string; optional?: boolean }) {
  const t = useTheme();
  return (
    <Text style={{ paddingHorizontal: 4, fontSize: 13, fontWeight: "600", color: t.muted }}>
      {children}
      {optional ? <Text style={{ fontWeight: "400", color: t.subtle }}> Optional</Text> : null}
    </Text>
  );
}

// ── Avatars and badges ──────────────────────────────────────────────────────

export function initials(name: string | null | undefined): string {
  return (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * `group` marks a group chat's icon: the Destiny logo until groups can set
 * their own picture (`uri` wins once they can). Announcements keep the
 * megaphone so the read-only channel stays recognisable in a list.
 */
export function Avatar({ name, size, radius, announcements, group, uri }: { name: string; size: number; radius?: number; announcements?: boolean; group?: boolean; uri?: string | null }) {
  const t = useTheme();
  const r = radius ?? size / 2;
  if (announcements) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name="megaphone" size={Math.round(size * 0.46)} color={t.tint} strokeWidth={1.9} />
      </View>
    );
  }
  if (group && !uri) {
    return (
      <View style={{ width: size, height: size, borderRadius: r, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <SvgXml xml={LOGO_XML} width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} accessibilityLabel="Destiny Church" />
      </View>
    );
  }
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: r, backgroundColor: t.avatar }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: t.avatar, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFFFFF", fontSize: Math.round(size * 0.37), fontWeight: "600", letterSpacing: 0.5 }}>{initials(name)}</Text>
    </View>
  );
}

export function CountBadge({ count, small }: { count: number; small?: boolean }) {
  const h = small ? 20 : 22;
  return (
    <View style={{ minWidth: h, height: h, borderRadius: h / 2, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", paddingHorizontal: small ? 6 : 7 }}>
      <Text maxFontSizeMultiplier={1.2} style={{ color: "#0E1013", fontSize: small ? 12 : 13, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export function RoleTag({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.accentSoft, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 0.3, color: t.tint }}>{label}</Text>
    </View>
  );
}

/**
 * The tag beside someone's name: their account role (Admin, Senior Leader, CG
 * Leader) if they have one, otherwise "Group admin" when they run this group.
 */
export function MemberTag({ tag, groupAdmin }: { tag: D1LeaderRole | null; groupAdmin: boolean }) {
  if (tag) return <RoleTag label={D1_ROLE_LABELS[tag]} />;
  return groupAdmin ? <RoleTag label="Group admin" /> : null;
}

// ── Cards and lists ─────────────────────────────────────────────────────────

export function Card({ children, style, shadow }: { children: ReactNode; style?: StyleProp<ViewStyle>; shadow?: boolean }) {
  const t = useTheme();
  return <View style={[{ borderRadius: 22, backgroundColor: t.card, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: t.glassLine }, shadow && t.shadow, style]}>{children}</View>;
}

export function Separator({ inset = 16 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: inset }} />;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ paddingHorizontal: 16, fontSize: 13, fontWeight: "600", color: t.muted }}>{children}</Text>;
}

export function SettingsRow({ icon, iconBg, iconColor, label, value, onPress, chevron = true }: { icon?: IconName; iconBg?: string; iconColor?: string; label: string; value?: string; onPress?: () => void; chevron?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent" }]}>
      {icon ? (
        <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: iconBg ?? t.avatar, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} color={iconColor ?? "#FFFFFF"} />
        </View>
      ) : null}
      <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{label}</Text>
      {value ? <Text style={{ fontSize: 17, color: t.muted }}>{value}</Text> : null}
      {chevron && onPress ? <Icon name="chevronRight" size={14} color={t.subtle} strokeWidth={2.4} /> : null}
    </Pressable>
  );
}

/** Full-width card button, e.g. "Sign out", "Leave group". */
export function CardButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [{ height: 50, borderRadius: 22, backgroundColor: pressed ? t.fill : t.card, borderWidth: StyleSheet.hairlineWidth, borderColor: t.glassLine, alignItems: "center", justifyContent: "center" }]}>
      {busy ? <ActivityIndicator color={t.tint} /> : <Text style={{ fontSize: 17, color: t.tint }}>{label}</Text>}
    </Pressable>
  );
}

// ── Screen scaffolding ──────────────────────────────────────────────────────

export function LargeTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontSize: 34, fontWeight: "700", letterSpacing: 0.3, color: t.text }, style]}>{children}</Text>;
}

export function Lead({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontSize: 17, lineHeight: 23, color: t.muted }, style]}>{children}</Text>;
}

/** The floating header used by modal-style screens: close/back, centred title. */
export function ModalHeader({ title, icon = "close" }: { title: string; icon?: "back" | "close" }) {
  const t = useTheme();
  return (
    <View style={{ height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <BackButton icon={icon} />
      <Text style={{ fontSize: 17, fontWeight: "600", color: t.text }}>{title}</Text>
      <View style={{ width: 44 }} />
    </View>
  );
}

/** Floating back button over a fading top edge, for grouped scroll screens. */
export function FloatingBack({ background }: { background: string }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <LinearGradient pointerEvents="none" colors={[background, background, withAlpha(background, 0)]} locations={[0, 0.5, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 66 }} />
      <View style={{ position: "absolute", top: insets.top + 6, left: 16 }}>
        <BackButton />
      </View>
    </>
  );
}

export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function Centered({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 }}>{children}</View>;
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: 80, paddingHorizontal: 40, alignItems: "center", gap: 6 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", color: t.text, textAlign: "center" }}>{title}</Text>
      {body ? <Text style={{ fontSize: 15, lineHeight: 20, color: t.muted, textAlign: "center" }}>{body}</Text> : null}
    </View>
  );
}

// ── Loading skeletons ───────────────────────────────────────────────────────

/** Shared pulse so every placeholder on screen breathes in step. */
function usePulse() {
  const v = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.55, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

/** Wraps a block of placeholders in one pulsing, screen-reader-labelled view. */
export function SkeletonGroup({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = usePulse();
  return (
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
}

/** One grey placeholder shape. Put it inside a SkeletonGroup to animate. */
export function Bone({ width, height, radius, style }: { width?: ViewStyle["width"]; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ width: width ?? "100%", height, borderRadius: radius ?? height / 2, backgroundColor: t.fill }, style]} />;
}

/** Placeholder for a card of avatar + two-line rows (members, groups). */
export function SkeletonRows({ count, avatar = 40 }: { count: number; avatar?: number }) {
  const t = useTheme();
  return (
    <Card>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16 }}>
          <Bone width={avatar} height={avatar} />
          <View style={{ flex: 1, gap: 7, paddingVertical: 14, paddingRight: 16, borderBottomWidth: i < count - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: t.sep }}>
            <Bone width={`${45 + ((i * 17) % 30)}%`} height={14} />
            <Bone width={`${25 + ((i * 11) % 20)}%`} height={11} />
          </View>
        </View>
      ))}
    </Card>
  );
}

/** E3: generic error with Try again, showing the server's message. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: 60, paddingHorizontal: 32, alignItems: "center", gap: 14 }}>
      <Text style={{ fontSize: 15, lineHeight: 20, color: t.muted, textAlign: "center" }}>{message}</Text>
      <SecondaryButton label="Try again" onPress={onRetry} style={{ paddingHorizontal: 28 }} />
    </View>
  );
}

/** Inline error line under a form. */
export function FormError({ message }: { message: string | null }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 }}>
      <Icon name="alertCircle" size={15} color={t.tint} strokeWidth={2.2} />
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: t.tint }}>{message}</Text>
    </View>
  );
}

// ── Dialogs ─────────────────────────────────────────────────────────────────

/** Centred confirm dialog, as in the prototype's delete / leave sheets. */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
  children,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  children?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Pressable accessibilityLabel="Cancel" onPress={onCancel} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} />
        <View style={[{ width: 300, borderRadius: 32, backgroundColor: t.sheet, paddingTop: 22, paddingHorizontal: 18, paddingBottom: 16, gap: 18 }, t.shadow]}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: t.text, textAlign: "center" }}>{title}</Text>
            <Text style={{ fontSize: 15, lineHeight: 20, color: t.muted, textAlign: "center" }}>{body}</Text>
          </View>
          {children}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <DialogButton t={t} label="Cancel" onPress={onCancel} />
            <DialogButton t={t} label={confirmLabel} onPress={onConfirm} primary busy={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DialogButton({ t, label, onPress, primary, busy }: { t: Theme; label: string; onPress: () => void; primary?: boolean; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [{ flex: 1, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: primary ? ORANGE : t.fill, opacity: pressed ? 0.8 : 1 }]}>
      {busy ? <ActivityIndicator color="#0E1013" /> : <Text style={{ fontSize: 17, fontWeight: "600", color: primary ? "#0E1013" : t.text }}>{label}</Text>}
    </Pressable>
  );
}

/** A check mark on the right of a picker row. */
export function PickRow({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingLeft: 16, backgroundColor: pressed ? t.fill : "transparent" }]}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingRight: 16 }}>
        <Text style={{ flex: 1, fontSize: 17, color: t.text }}>{label}</Text>
        {on ? <Icon name="check" size={18} color={t.tint} strokeWidth={2.8} /> : null}
      </View>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  pill: { minHeight: 52, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 17, fontWeight: "600", letterSpacing: -0.2 },
});
