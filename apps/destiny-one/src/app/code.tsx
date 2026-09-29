// A3 Code — the emailed 6-digit code (CodeBoxes).

import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { CodeBoxes } from "@/components/CodeBoxes";
import { FormError, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { isAdding } from "@/lib/accounts";
import { requestEmailCode, verifyEmailCode } from "@/lib/auth";
import { routeFor, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const RESEND_AFTER = 60;

export default function Code() {
  const t = useTheme();
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const { setMe, finishAdding } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_AFTER);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function verify(value = code) {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const me = await verifyEmailCode(email, value);
      // "Add account": the new account becomes the active one. Otherwise this
      // is the only sign-in on the device.
      if (isAdding()) {
        const added = await finishAdding(me);
        if (!added.ok) {
          setError(added.message);
          setCode("");
          return;
        }
      } else setMe(me);
      router.dismissAll();
      router.replace(routeFor(me));
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      setError(msg.includes("expired") ? "That code has expired. Send a new one." : "That code isn't right. Check it and try again.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setWait(RESEND_AFTER);
    try {
      await requestEmailCode(email);
    } catch {
      setError("Please wait a minute and try again.");
    }
  }

  return (
    <AuthScreen back footer={<PrimaryButton label="Verify" onPress={() => verify()} busy={busy} disabled={code.length !== 6} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Enter code</LargeTitle>
        <Lead>
          Sent to <Text style={{ color: t.text, fontWeight: "500" }}>{email}</Text>
        </Lead>
        <Text style={{ fontSize: 13, lineHeight: 18, color: t.subtle }}>
          If this email has a Destiny One account or invite, a code is on its way. Nothing after a few minutes? Check the address, or ask your team leader or the church office for an invite.
        </Text>
        <TextButton label="Change email" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />
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
          <TextButton label="Resend code" onPress={resend} style={{ alignSelf: "flex-start" }} />
        )}
      </View>
    </AuthScreen>
  );
}
