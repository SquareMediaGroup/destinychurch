// Set or change the password for the account you're using. The emailed code
// keeps working either way, and is how you'd reset a forgotten password.
//
// Supabase's leaked password protection refuses passwords found in known data
// breaches. That gets its own card rather than a one-line error, because the
// fix is to choose a different password, not to fix a typo: the field is
// cleared and focused, ready for a new one. The same card greets someone sent
// here after signing in with a password that has since leaked (password.tsx).

import { useRef, useState } from "react";
import { AccessibilityInfo, Text, View, type TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { passwordRejection, type PasswordRejection } from "@destiny/shared";
import { AuthScreen } from "@/components/AuthScreen";
import { Icon } from "@/components/Icon";
import { Card, Field, FormError, LargeTitle, Lead, PrimaryButton } from "@/components/ui";
import { PasswordRejectedError, setPassword } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function SetPassword() {
  const [password, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Opened from the "Change your password" prompt after signing in with a leaked password.
  const { leaked } = useLocalSearchParams<{ leaked?: string }>();
  const [rejection, setRejection] = useState<PasswordRejection | null>(() =>
    leaked === "1" ? { ...passwordRejection(["pwned"]), title: "Your current password has been leaked" } : null,
  );
  const input = useRef<TextInput>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setRejection(null);
    try {
      await setPassword(password);
      haptic.success();
      router.back();
    } catch (err) {
      if (err instanceof PasswordRejectedError) {
        setRejection(err.rejection);
        AccessibilityInfo.announceForAccessibility(`${err.rejection.title}. ${err.rejection.body}`);
        if (err.rejection.breached) {
          setValue("");
          input.current?.focus();
        }
      } else {
        setError(errorMessage(err));
      }
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
          ref={input}
          value={password}
          onChangeText={(v) => {
            setValue(v);
            setError(null);
          }}
          placeholder={rejection?.breached ? "A different password" : "New password"}
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
        {rejection ? <RejectedCard rejection={rejection} /> : null}
      </View>
    </AuthScreen>
  );
}

function RejectedCard({ rejection }: { rejection: PasswordRejection }) {
  const t = useTheme();
  return (
    <Card style={{ flexDirection: "row", gap: 12, padding: 16 }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={rejection.breached ? "shield" : "alertCircle"} size={18} color={t.tint} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, gap: 4 }} accessible accessibilityRole="alert">
        <Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>{rejection.title}</Text>
        <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted }}>{rejection.body}</Text>
        {rejection.breached ? (
          <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted, marginTop: 4 }}>
            Tip: three or four random words together make a password that&apos;s long and easy to remember.
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
