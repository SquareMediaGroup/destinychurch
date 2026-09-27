// A5 Request access — signed in without an invite. Also "Edit my request"
// from A6 (the server updates the pending request).

import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Field, FieldLabel, FormError, LargeTitle, Lead, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage, routeFor, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

/** "DD / MM / YYYY" as typed → YYYY-MM-DD, or null if it isn't a real date. */
function parseDob(text: string): string | null {
  const m = /^(\d{1,2})\D+(\d{1,2})\D+(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== mo - 1 || y < 1900 || date > new Date()) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Inserts the slashes as they type digits. */
function maskDob(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean);
  return parts.join(" / ");
}

export default function RequestAccess() {
  const t = useTheme();
  const { me, setMe, signOut } = useSession();
  const [name, setName] = useState(me?.onboarding === "request_submitted" ? me.displayName : "");
  const [dob, setDob] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    const dateOfBirth = dob.trim() ? parseDob(dob) : undefined;
    if (dateOfBirth === null) {
      setError("Please enter your date of birth as DD / MM / YYYY, or leave it blank.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api.requestAccess({ name: name.trim(), dateOfBirth, note: note.trim() || undefined });
      setMe(next);
      router.replace(routeFor(next));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const canGoBack = router.canGoBack();

  return (
    <AuthScreen
      back={canGoBack}
      footer={
        <>
          <PrimaryButton label="Send request" onPress={send} busy={busy} disabled={!name.trim()} />
          {!canGoBack ? (
            <Text onPress={() => void signOut().then(() => router.replace("/welcome"))} style={{ textAlign: "center", fontSize: 17, color: t.tint, paddingVertical: 12 }}>
              Sign out
            </Text>
          ) : null}
        </>
      }
    >
      <View style={{ paddingTop: canGoBack ? 14 : 30, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Request access</LargeTitle>
        <Lead>{me?.onboardingMessage ?? "We couldn't find an invite for this email. Tell us who you are and the church office will check."}</Lead>
      </View>

      <View style={{ marginTop: 24, gap: 18 }}>
        <View style={{ gap: 8 }}>
          <FieldLabel>Full name</FieldLabel>
          <Field value={name} onChangeText={setName} placeholder="As the church knows you" autoCapitalize="words" autoComplete="name" textContentType="name" />
        </View>
        <View style={{ gap: 8 }}>
          <FieldLabel optional>Date of birth</FieldLabel>
          <Field value={dob} onChangeText={(v) => setDob(maskDob(v))} placeholder="DD / MM / YYYY" keyboardType="number-pad" inputStyle={{ fontVariant: ["tabular-nums"] }} />
          <Text style={{ paddingHorizontal: 4, fontSize: 13, lineHeight: 18, color: t.subtle }}>Staff will confirm your age. We only keep the date you turn 18.</Text>
        </View>
        <View style={{ gap: 8 }}>
          <FieldLabel optional>Anything we should know?</FieldLabel>
          <Field
            value={note}
            onChangeText={(v) => setNote(v.slice(0, 500))}
            placeholder="e.g. I serve on the Media team"
            multiline
            maxLength={500}
            footer={<Text style={{ alignSelf: "flex-end", paddingBottom: 10, fontSize: 12, color: t.subtle, fontVariant: ["tabular-nums"] }}>{note.length} / 500</Text>}
          />
        </View>
        <FormError message={error} />
      </View>
    </AuthScreen>
  );
}
