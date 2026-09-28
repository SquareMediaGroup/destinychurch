// A3 Code — six boxes over one hidden input. The current box carries the
// beam. SMS one-time-code autofill is deliberately off (no phone numbers).

import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Beam, FormError, LargeTitle, Lead, PrimaryButton, TextButton } from "@/components/ui";
import { D1ApiError } from "@/lib/api";
import { requestEmailCode, verifyEmailCode } from "@/lib/auth";
import { routeFor, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

const RESEND_AFTER = 60;

export default function Code() {
  const t = useTheme();
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const { setMe } = useSession();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(true);
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
      setMe(me);
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
    } catch (err) {
      setError(err instanceof D1ApiError && err.code !== "rate_limited" ? "Couldn't send the code. Check your connection and try again." : "Please wait a few minutes and try again.");
    }
  }

  const current = Math.min(code.length, 5);

  return (
    <AuthScreen back footer={<PrimaryButton label="Verify" onPress={() => verify()} busy={busy} disabled={code.length !== 6} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Enter code</LargeTitle>
        <Lead>
          If <Text style={{ color: t.text, fontWeight: "500" }}>{email}</Text> has a Destiny One account or invite, a code is on its way.
        </Lead>
        <Text style={{ paddingHorizontal: 4, fontSize: 13, lineHeight: 18, color: t.subtle }}>
          Nothing after a few minutes? Check your junk folder, or ask your team leader or the church office for an invite.
        </Text>
        <TextButton label="Change email" onPress={() => router.back()} style={{ alignSelf: "flex-start" }} />
      </View>

      <Pressable onPress={() => input.current?.focus()} accessibilityLabel="6-digit code" style={{ marginTop: 28, flexDirection: "row", gap: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const active = focused && i === current && code.length < 6;
          return (
            <Beam key={i} radius={15} active={active} dim="rgba(245,128,33,0.3)" style={{ flex: 1 }}>
              <View style={{ height: 59, borderRadius: 13.5, backgroundColor: t.field, alignItems: "center", justifyContent: "center", flexDirection: "row" }}>
                <Text style={{ fontSize: 28, fontWeight: "600", color: t.text, fontVariant: ["tabular-nums"] }}>{code[i] ?? ""}</Text>
                {active ? <View style={{ width: 2, height: 28, borderRadius: 1, backgroundColor: ORANGE }} /> : null}
              </View>
            </Beam>
          );
        })}
        <TextInput
          ref={input}
          value={code}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
            setError(null);
            if (digits.length === 6) void verify(digits);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          autoComplete="off"
          textContentType="none"
          caretHidden
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        />
      </Pressable>

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
