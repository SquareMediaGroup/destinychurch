// Password sign-in. Same finish as the emailed code (code.tsx): in "Add
// account" mode the new account is checked and becomes active; otherwise it
// is the only sign-in on the device.

import { useState } from "react";
import { Alert, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SIGN_IN_FAILED } from "@destiny/shared";
import { AuthScreen } from "@/components/AuthScreen";
import { Field, FormError, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { isAdding } from "@/lib/accounts";
import { requestEmailCode, signInWithPassword } from "@/lib/auth";
import { routeFor, useSession } from "@/state/session";
import { haptic } from "@/lib/haptics";

export default function Password() {
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const { setMe, finishAdding } = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { me, leaked } = await signInWithPassword(email, password);
      if (isAdding()) {
        const added = await finishAdding(me);
        if (!added.ok) {
          setError(added.message);
          return;
        }
      } else setMe(me);
      haptic.success();
      router.dismissAll();
      router.replace(routeFor(me));
      if (leaked && me.onboarding === "active") offerPasswordChange();
    } catch {
      // Whatever went wrong, it looks the same from here (see signInWithPassword).
      setError(SIGN_IN_FAILED);
    } finally {
      setBusy(false);
    }
  }

  async function emailCode() {
    try {
      await requestEmailCode(email);
    } catch {
      // A failed send shows up as "Resend code" on the next screen.
    }
    router.replace({ pathname: "/code", params: { email } });
  }

  return (
    <AuthScreen back footer={<PrimaryButton label="Sign in" onPress={signIn} busy={busy} disabled={!password} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Your password</LargeTitle>
        <Lead>{email}</Lead>
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <Field
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          placeholder="Password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={signIn}
          autoFocus
          inputStyle={{ minHeight: 56 }}
        />
        <FormError message={error} />
        <TextButton label="Forgot it? Email me a code" onPress={emailCode} style={{ alignSelf: "flex-start" }} />
      </View>
    </AuthScreen>
  );
}

/** Signed in, but the password has since turned up in a data breach: offer to change it now. */
function offerPasswordChange() {
  Alert.alert(
    "Change your password",
    "Your password appears in a list of passwords leaked from other websites, so it's easy for someone else to guess. Choose a new one to keep your account safe.",
    [
      { text: "Later", style: "cancel" },
      { text: "Change password", isPreferred: true, onPress: () => router.push({ pathname: "/set-password", params: { leaked: "1" } }) },
    ],
  );
}
