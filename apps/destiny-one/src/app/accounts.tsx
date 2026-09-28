// Accounts — switch between the accounts signed in on this device, add
// another, or sign one out. Opened from Settings, or by holding the Settings
// tab. Switching asks for Face ID / passcode first (accounts.confirmOwner).

import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Avatar, Card, Separator } from "@/components/ui";
import { MAX_ACCOUNTS, beginAdd, confirmOwner, type Account } from "@/lib/accounts";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function Accounts() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { accounts, activeSlot, session, switchTo, removeAccount } = useSession();
  const [opening, setOpening] = useState<string | null>(null);

  async function open(account: Account) {
    if (account.slot === activeSlot && session) {
      router.back();
      return;
    }
    if (opening) return;
    if (!(await confirmOwner(account.displayName))) return;
    setOpening(account.slot);
    try {
      await switchTo(account.slot);
      router.dismissAll();
      router.replace("/");
    } catch (err) {
      Alert.alert("Couldn't switch account", errorMessage(err));
    } finally {
      setOpening(null);
    }
  }

  function remove(account: Account) {
    if (account.slot === activeSlot) return;
    Alert.alert(`Sign out of ${account.displayName}?`, "You can add this account again at any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void removeAccount(account.slot) },
    ]);
  }

  async function add() {
    if (accounts.length >= MAX_ACCOUNTS) {
      Alert.alert("Too many accounts", `You can have up to ${MAX_ACCOUNTS} accounts on this device. Sign out of one to add another.`);
      return;
    }
    // Signed out right now: this is just a normal sign-in.
    if (session) await beginAdd();
    router.back();
    router.push("/email");
  }

  return (
    <View style={{ backgroundColor: t.grouped, paddingTop: 22, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 10 }}>
      <Text style={{ textAlign: "center", fontSize: 17, fontWeight: "600", color: t.text, marginBottom: 6 }}>Accounts</Text>

      <Card>
        {accounts.map((account, i) => {
          const current = account.slot === activeSlot && !!session;
          return (
            <View key={account.slot}>
              {i > 0 ? <Separator inset={74} /> : null}
              <Pressable
                onPress={() => void open(account)}
                onLongPress={current ? undefined : () => remove(account)}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                accessibilityLabel={current ? `${account.displayName}, current account` : `Switch to ${account.displayName}`}
                accessibilityHint={current ? undefined : "Hold to sign out of this account"}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent" }]}
              >
                <Avatar name={account.displayName} uri={account.avatarUrl} size={44} />
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: current ? "600" : "400", color: t.text }}>
                    {account.displayName}
                  </Text>
                  {account.email ? (
                    <Text numberOfLines={1} style={{ fontSize: 14, color: t.muted }}>
                      {account.email}
                    </Text>
                  ) : null}
                </View>
                {opening === account.slot ? (
                  <ActivityIndicator color={t.tint} />
                ) : current ? (
                  <Icon name="check" size={20} color={ORANGE} strokeWidth={2.4} />
                ) : null}
              </Pressable>
            </View>
          );
        })}
        {accounts.length > 0 ? <Separator inset={74} /> : null}
        <Pressable
          onPress={() => void add()}
          accessibilityRole="button"
          style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? t.fill : "transparent" }]}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={20} color={t.tint} strokeWidth={2.2} />
          </View>
          <Text style={{ flex: 1, fontSize: 17, color: t.tint }}>Add account</Text>
        </Pressable>
      </Card>

      <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
        Switching asks for Face ID or your passcode. Notifications come to the account you&apos;re using. Hold an account to sign out of it.
      </Text>
    </View>
  );
}
