// Six boxes over one hidden input, for an emailed 6-digit code. The current
// box carries the beam. SMS one-time-code autofill is deliberately off (no
// phone numbers). Calls onComplete as soon as the sixth digit goes in.

import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Beam } from "@/components/ui";
import { ORANGE, useTheme } from "@/theme/tokens";

export function CodeBoxes({ code, onChange, onComplete }: { code: string; onChange: (code: string) => void; onComplete: (code: string) => void }) {
  const t = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(true);
  const current = Math.min(code.length, 5);

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="6-digit code" style={{ marginTop: 28, flexDirection: "row", gap: 8 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const active = focused && i === current && code.length < 6;
        return (
          <Beam key={i} radius={15} active={active} dim="rgba(245,128,33,0.3)" style={{ flex: 1 }}>
            <View style={{ height: 59, borderRadius: 13.5, backgroundColor: t.field, alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
              <Text style={{ fontSize: 28, fontWeight: "600", color: t.text, fontVariant: ["tabular-nums"] }}>{code[i] ?? ""}</Text>
              {active ? <View style={{ width: 2, height: 28, borderRadius: 1, backgroundColor: ORANGE }} /> : null}
            </View>
          </Beam>
        );
      })}
      <TextInput
        ref={input}
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, "").slice(0, 6);
          onChange(digits);
          if (digits.length === 6) onComplete(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        autoComplete="off"
        textContentType="none"
        caretHidden
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
}
