// D3 Delete my account — explains what happens, then asks them to type
// DELETE. Messages stay under "Former member" for the safeguarding retention
// period, then are deleted.

import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Field, FormError, LargeTitle, Lead, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const POINTS = [
  "You'll leave every group and community.",
  "Your messages stay, shown as \"Former member\", for a little while. Then they're deleted.",
  "This can't be undone.",
];

export default function DeleteAccount() {
  const t = useTheme();
  const { signOut } = useSession();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount();
      // The account is gone; tidying up this phone mustn't turn that into an error.
      await signOut().catch(() => undefined);
      router.dismissAll();
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthScreen back grouped footer={<PrimaryButton label="Delete my account" onPress={del} busy={busy} disabled={typed.trim() !== "DELETE"} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Delete my account</LargeTitle>
        <Lead>Here&apos;s what happens:</Lead>
      </View>
      <View style={{ marginTop: 16, gap: 10, paddingHorizontal: 4 }}>
        {POINTS.map((p) => (
          <Text key={p} style={{ fontSize: 15, lineHeight: 21, color: t.muted }}>
            {p}
          </Text>
        ))}
      </View>
      <View style={{ marginTop: 24, gap: 8 }}>
        <Text style={{ paddingHorizontal: 4, fontSize: 13, fontWeight: "600", color: t.muted }}>Type DELETE to confirm</Text>
        <Field value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} background={t.card} />
        <FormError message={error} />
      </View>
    </AuthScreen>
  );
}
