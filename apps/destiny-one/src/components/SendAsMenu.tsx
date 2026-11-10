// Shown above the Send button after holding it: schedule the message for later
// (leaders and admins), and/or pick which of your other signed-in accounts
// sends it.

import { Pressable, Text, View } from "react-native";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import type { Account } from "@/lib/accounts";
import { useTheme } from "@/theme/tokens";

export function SendAsMenu({
  options,
  checking,
  showAccounts,
  onPick,
  onSchedule,
  onClose,
}: {
  options: Account[];
  checking: boolean;
  /** False when only Schedule is on offer (there is no other account to send as). */
  showAccounts: boolean;
  onPick: (a: Account) => void;
  onSchedule?: () => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <>
      <Pressable onPress={onClose} accessibilityLabel="Close" style={{ position: "absolute", top: -2000, bottom: -2000, left: -2000, right: -2000 }} />
      <View style={[{ position: "absolute", right: 0, bottom: 48, minWidth: 240, borderRadius: 18, backgroundColor: t.card, paddingVertical: 6 }, t.shadow]}>
        {onSchedule ? (
          <Pressable
            onPress={onSchedule}
            accessibilityRole="button"
            accessibilityLabel="Schedule"
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="clock" size={20} color={t.text} />
            <Text style={{ flex: 1, fontSize: 16, color: t.text }}>Schedule</Text>
          </Pressable>
        ) : null}
        {showAccounts ? <Text style={{ fontSize: 12, fontWeight: "600", color: t.subtle, paddingHorizontal: 14, paddingVertical: 6 }}>SEND AS</Text> : null}
        {(showAccounts ? options : []).map((a) => (
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
        {showAccounts && options.length === 0 ? (
          <Text style={{ fontSize: 15, color: t.subtle, paddingHorizontal: 14, paddingVertical: 8 }}>{checking ? "Checking your accounts" : "None of your other accounts can send here."}</Text>
        ) : null}
      </View>
    </>
  );
}
