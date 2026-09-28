// Set or change the password for the account you're using. The emailed code
// keeps working either way, and is how you'd reset a forgotten password.

import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Field, FormError, LargeTitle, Lead, PrimaryButton } from "@/components/ui";
import { setPassword } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { errorMessage } from "@/state/session";

export default function SetPassword() {
  const [password, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await setPassword(password);
      haptic.success();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen back footer={<PrimaryButton label="Save password" onPress={save} busy={busy} disabled={!password} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Password</LargeTitle>
        <Lead>Use at least 10 characters. You can still sign in with an emailed code.</Lead>
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <Field
          value={password}
          onChangeText={(v) => {
            setValue(v);
            setError(null);
          }}
          placeholder="New password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={save}
          autoFocus
          inputStyle={{ minHeight: 56 }}
        />
        <FormError message={error} />
      </View>
    </AuthScreen>
  );
}
