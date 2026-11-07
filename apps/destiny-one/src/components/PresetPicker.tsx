// A five-step picker (Low to High) for settings that used to be sliders, on
// the sliding segmented control.

import { Text, View } from "react-native";
import { Segmented } from "@/components/Segmented";
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
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 15, color: t.text }}>{label}</Text>
        <Text style={{ fontSize: 15, color: t.muted }}>{PRESET_LABELS[index]}</Text>
      </View>
      <Segmented options={PRESET_LABELS} index={index} onChange={onChange} accessibilityLabel={label} />
    </View>
  );
}
