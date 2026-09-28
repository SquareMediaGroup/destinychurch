// Shown above the Send button after holding it: pick which of your other
// signed-in accounts sends this message.

import { Pressable, Text, View } from "react-native";
import { Avatar } from "@/components/ui";
import type { Account } from "@/lib/accounts";
import { useTheme } from "@/theme/tokens";

export function SendAsMenu({ options, checking, onPick, onClose }: { options: Account[]; checking: boolean; onPick: (a: Account) => void; onClose: () => void }) {
  const t = useTheme();
  return (
    <>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{ position: "absolute", top: -2000, bottom: -2000, left: -2000, right: -2000 }} />
      <View style={[{ position: "absolute", right: 0, bottom: 48, minWidth: 240, borderRadius: 18, backgroundColor: t.card, paddingVertical: 6 }, t.shadow]}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: t.subtle, paddingHorizontal: 14, paddingVertical: 6 }}>SEND AS</Text>
        {options.map((a) => (
          <Pressable
            key={a.slot}
            onPress={() => onPick(a)}
            accessibilityRole="button"
            accessibilityLabel={`Send as ${a.displayName}`}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 14, opacity: pressed ? 0.6 : 1 })}
          >
            <Avatar name={a.displayName} uri={a.avatarUrl} size={28} />
            <Text style={{ flex: 1, fontSize: 16, color: t.text }}>{a.displayName}</Text>
          </Pressable>
        ))}
        {options.length === 0 ? (
          <Text style={{ fontSize: 15, color: t.subtle, paddingHorizontal: 14, paddingVertical: 8 }}>{checking ? "Checking your accounts" : "None of your other accounts can send here."}</Text>
        ) : null}
      </View>
    </>
  );
}
