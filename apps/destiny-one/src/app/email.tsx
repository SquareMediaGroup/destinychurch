// A2 Email — sends a 6-digit code (never SMS).

import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Icon } from "@/components/Icon";
import { Field, FormError, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { D1ApiError } from "@/lib/api";
import { requestEmailCode } from "@/lib/auth";
import { useTheme } from "@/theme/tokens";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Email() {
  const t = useTheme();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function usePassword() {
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError("That doesn't look like an email address.");
      return;
    }
    router.push({ pathname: "/password", params: { email: value } });
  }

  async function send() {
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setError("That doesn't look like an email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // The server sends a code only if this email can get in, and answers the
      // same either way (so nobody can use this screen to find out who's a member).
      await requestEmailCode(value);
      router.push({ pathname: "/code", params: { email: value } });
    } catch (err) {
      const limited = err instanceof D1ApiError && err.code === "rate_limited";
      setError(limited ? "Please wait a minute and try again." : "Couldn't send the code. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      back
      footer={
        <View style={{ gap: 6 }}>
          <PrimaryButton label="Use password" onPress={usePassword} disabled={!email.trim() || busy} />
          <TextButton label="Email me a code instead" onPress={send} style={{ alignSelf: "center", paddingVertical: 8 }} />
        </View>
      }
    >
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Your email</LargeTitle>
        <Lead>Use the email the church office has for you. Sign in with your password, or we&apos;ll email you a 6-digit code.</Lead>
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <Field
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={usePassword}
          autoFocus
          leading={<Icon name="mail" size={20} color={t.subtle} strokeWidth={1.8} />}
          inputStyle={{ minHeight: 56 }}
        />
        <Text style={{ paddingHorizontal: 4, fontSize: 13, lineHeight: 18, color: t.subtle }}>No one else in Destiny One can see your email.</Text>
        <FormError message={error} />
      </View>
    </AuthScreen>
  );
}
