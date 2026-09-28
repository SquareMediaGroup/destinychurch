// "Add account": add a child's account or an admin account. Both are sign-ins
// to accounts that already exist; the choice only labels the account and lets
// the server's answer be checked against it (checkAddedAccount, session.tsx).
// Nothing is created or granted here.

import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AccountKind } from "@destiny/shared";
import { Card, Separator, SettingsRow } from "@/components/ui";
import { MAX_ACCOUNTS, beginAdd } from "@/lib/accounts";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

/** The two choices. Used inside the accounts sheet and on its own (below). */
export function AddAccountChoices() {
  const t = useTheme();
  const { accounts, session } = useSession();

  async function add(kind: AccountKind) {
    if (accounts.length >= MAX_ACCOUNTS) {
      Alert.alert("Too many accounts", `You can have up to ${MAX_ACCOUNTS} accounts on this device. Sign out of one to add another.`);
      return;
    }
    // Signed out right now: this is just a normal sign-in.
    if (session) await beginAdd(kind);
    router.dismissAll();
    router.push("/email");
  }

  return (
    <View style={{ gap: 10 }}>
      <Card>
        <SettingsRow icon="people" label="Add child" onPress={() => void add("child")} />
        <Separator inset={62} />
        <SettingsRow icon="shield" label="Add admin account" onPress={() => void add("admin")} />
      </Card>
      <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
        Sign in with the account&apos;s own details. Nothing is shared between accounts.
      </Text>
    </View>
  );
}

/** Opened from Profile, under the name. */
export function AddAccountSheet() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.grouped, paddingTop: 22, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 10 }}>
      <Text style={{ textAlign: "center", fontSize: 17, fontWeight: "600", color: t.text, marginBottom: 6 }}>Add account</Text>
      <AddAccountChoices />
    </View>
  );
}
