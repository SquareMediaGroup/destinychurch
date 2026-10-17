// Change the email you sign in with. Two steps on one screen: the new address,
// then the 6-digit code sent to it. Nothing changes until the code checks out,
// and the old address gets a notice when it does (emailChange.server.ts).

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { CodeBoxes } from "@/components/CodeBoxes";
import { Icon } from "@/components/Icon";
import { Field, FormError, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { D1ApiError } from "@/lib/api";
import { confirmEmailChange, startEmailChange } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_AFTER = 60;

export default function ChangeEmail() {
  const t = useTheme();
  const { email: current } = useSession();
  const [email, setEmail] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function send() {
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) {
      setError("That doesn't look like an email address.");
      return;
    }
    if (value === current?.toLowerCase()) {
      setError("That's already your email.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setTicket(await startEmailChange(value));
      setCode("");
      setWait(RESEND_AFTER);
    } catch (err) {
      const limited = err instanceof D1ApiError && err.code === "rate_limited";
      setError(limited ? "Please wait a minute and try again." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    if (!ticket || value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await confirmEmailChange(ticket, value);
      haptic.success();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (ticket) {
    return (
      <AuthScreen back footer={<PrimaryButton label="Change email" onPress={() => verify()} busy={busy} disabled={code.length !== 6} />}>
        <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
          <LargeTitle>Enter code</LargeTitle>
          <Lead>
            Sent to <Text style={{ color: t.text, fontWeight: "500" }}>{email.trim().toLowerCase()}</Text>
          </Lead>
          <TextButton
            label="Use a different email"
            onPress={() => {
              setTicket(null);
              setCode("");
              setError(null);
            }}
            style={{ alignSelf: "flex-start" }}
          />
        </View>

        <CodeBoxes
          code={code}
          onChange={(digits) => {
            setCode(digits);
            setError(null);
          }}
          onComplete={(digits) => void verify(digits)}
        />

        <View style={{ marginTop: 16, paddingHorizontal: 4, gap: 10 }}>
          <FormError message={error} />
          {wait > 0 ? (
            <Text style={{ fontSize: 15, color: t.subtle, fontVariant: ["tabular-nums"] }}>
              Resend code in 0:{String(wait).padStart(2, "0")}
            </Text>
          ) : (
            <TextButton label="Resend code" onPress={send} style={{ alignSelf: "flex-start" }} />
          )}
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen back footer={<PrimaryButton label="Send code" onPress={send} busy={busy} disabled={!email.trim()} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Change email</LargeTitle>
        <Lead>We&apos;ll email a 6-digit code to the new address. Once you enter it, that&apos;s the email you sign in with.</Lead>
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <Field
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          placeholder="New email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={send}
          autoFocus
          leading={<Icon name="mail" size={20} color={t.subtle} strokeWidth={1.8} />}
          inputStyle={{ minHeight: 56 }}
        />
        {current ? <Text style={{ paddingHorizontal: 4, fontSize: 13, lineHeight: 18, color: t.subtle }}>Currently {current}. No one else in Destiny One can see your email.</Text> : null}
        <FormError message={error} />
      </View>
    </AuthScreen>
  );
}
