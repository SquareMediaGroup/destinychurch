// A3 Code — the emailed 6-digit code (CodeBoxes).

import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { AuthScreen } from "@/components/AuthScreen";
import { CodeBoxes } from "@/components/CodeBoxes";
import { FormError, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { isAdding } from "@/lib/accounts";
import { D1ApiError } from "@/lib/api";
import { checkEmailCode, finishSignIn, requestEmailCode } from "@/lib/auth";
import { errorMessage, routeFor, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";
import { haptic } from "@/lib/haptics";

const RESEND_AFTER = 60;

export default function Code() {
  const t = useTheme();
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const { setMe, finishAdding } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_AFTER);
  // The code was accepted but the next step failed: retrying must not send the
  // (now used) code again, only finish signing in.
  const accepted = useRef(false);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function verify(value = code) {
    if ((value.length !== 6 && !accepted.current) || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!accepted.current) {
        await checkEmailCode(email, value);
        accepted.current = true;
      }
      const me = await finishSignIn();
      // "Add account": the new account becomes the active one. Otherwise this
      // is the only sign-in on the device.
      if (isAdding()) {
        const added = await finishAdding(me);
        if (!added.ok) {
          // That sign-in has been dropped; another account needs a fresh code.
          accepted.current = false;
          setError(added.message);
          setCode("");
          return;
        }
      } else setMe(me);
      haptic.success();
      router.dismissAll();
      router.replace(routeFor(me));
    } catch (err) {
      if (err instanceof D1ApiError) {
        // The code was fine; Destiny One couldn't be reached. Verify tries that step again.
        setError(errorMessage(err, "Couldn't finish signing in. Try again."));
      } else if (isAuthRetryableFetchError(err)) {
        setError("You're offline. Check your connection and try again.");
      } else {
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        setError(msg.includes("expired") ? "That code has expired. Send a new one." : "That code isn't right. Check it and try again.");
        setCode("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    accepted.current = false;
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
        error={error}
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
