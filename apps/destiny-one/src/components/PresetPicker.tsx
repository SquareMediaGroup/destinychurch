// A five-step picker (Low to High) in the iOS segmented-control style, for
// settings that used to be sliders. Tap only: there is no dragging, so it can
// never fight the swipe-back gesture. Screen readers get a radio group.

import { Pressable, Text, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { useTheme } from "@/theme/tokens";

export const PRESET_LABELS = ["Low", "Low-Med", "Med", "High-Med", "High"] as const;

interface Props {
  label: string;
  /** Index 0 to 4 of the selected preset. */
  index: number;
  onChange: (index: number) => void;
}

export function PresetPicker({ label, index, onChange }: Props) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 15, color: t.text }}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", padding: 2, borderRadius: 9, backgroundColor: t.fill2 }}>
        {PRESET_LABELS.map((name, i) => {
          const on = i === index;
          return (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}, ${name}`}
              onPress={() => {
                if (on) return;
                haptic.selection();
                onChange(i);
              }}
              style={[
                { flex: 1, height: 32, borderRadius: 7, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
                on ? [{ backgroundColor: t.card }, t.shadow] : null,
              ]}
            >
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 12, fontWeight: on ? "600" : "500", color: on ? t.text : t.muted }}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
