// D5 Report a problem / Send feedback, from the Profile tab. Goes to the
// Destiny One Admins at church (/admin/destiny-one/feedback), not the
// safeguarding team, so the screen points worries about people elsewhere.
// The app version and phone model go with it, to help fix problems. Also
// reached by shaking the phone (src/lib/useShakeToReport.ts), switched off here.

import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAX_FEEDBACK_LENGTH, type D1FeedbackKind } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Card, Field, FieldLabel, FormError, Lead, ModalHeader, PickRow, PrimaryButton, SecondaryButton, SectionLabel } from "@/components/ui";
import { api } from "@/lib/api";
import { lastErrorId } from "@/lib/sentry";
import { errorMessage } from "@/state/session";
import { shakeToReport, useShakeToReport } from "@/state/shakeToReport";
import { ORANGE, useTheme } from "@/theme/tokens";

const KINDS: { kind: D1FeedbackKind; label: string }[] = [
  { kind: "problem", label: "Something isn't working" },
  { kind: "idea", label: "An idea or other feedback" },
];

function deviceDetails() {
  const version = Constants.expoConfig?.version;
  const build = Application.nativeBuildVersion;
  return {
    appVersion: version ? (build ? `${version} (${build})` : version) : undefined,
    platform: Platform.OS,
    osVersion: Device.osVersion ?? undefined,
    device: Device.modelName ?? undefined,
  };
}

export default function Feedback() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<D1FeedbackKind>(params.kind === "idea" ? "idea" : "problem");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const shakeOn = useShakeToReport();

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const errorId = kind === "problem" ? (lastErrorId() ?? undefined) : undefined;
      await api.sendFeedback({ kind, body: body.trim(), ...deviceDetails(), errorId });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={36} color={t.tint} strokeWidth={2.2} />
          </View>
          <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "700", color: t.text }}>
            Thanks
          </Text>
          <Lead style={{ textAlign: "center", maxWidth: 300 }}>
            {kind === "problem" ? "The Destiny One team will look into it." : "The Destiny One team will read it."}
          </Lead>
        </View>
        <SecondaryButton label="Done" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
      <ModalHeader title={kind === "problem" ? "Report a problem" : "Send feedback"} />
      <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <SectionLabel>What&apos;s it about?</SectionLabel>
          <Card>
            {KINDS.map((k, i) => (
              <View key={k.kind}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} /> : null}
                <PickRow label={k.label} on={kind === k.kind} onPress={() => setKind(k.kind)} />
              </View>
            ))}
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>{kind === "problem" ? "What happened?" : "What would you like to tell us?"}</FieldLabel>
          <Field
            value={body}
            onChangeText={(v) => setBody(v.slice(0, MAX_FEEDBACK_LENGTH))}
            placeholder={kind === "problem" ? "What were you doing, and what went wrong?" : "Your idea, or what you think of the app"}
            multiline
            maxLength={MAX_FEEDBACK_LENGTH}
            background={t.card}
            footer={
              <Text style={{ alignSelf: "flex-end", paddingBottom: 10, fontSize: 12, color: t.subtle, fontVariant: ["tabular-nums"] }}>
                {body.length} / {MAX_FEEDBACK_LENGTH}
              </Text>
            }
          />
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            This goes to the Destiny One team at church, with your app version and phone model to help fix problems.
          </Text>
        </View>

        <Card style={{ flexDirection: "row", gap: 12, padding: 14 }}>
          <Icon name="shield" size={20} color={t.muted} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 19, color: t.muted }}>
            Worried about a message or someone&apos;s safety? Use Report on the message, or talk to a leader. If someone is in danger right now, call 999.
          </Text>
        </Card>

        <View style={{ gap: 8 }}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ flex: 1, fontSize: 17, color: t.text }}>Shake to report a problem</Text>
            <Switch value={shakeOn} onValueChange={shakeToReport.set} trackColor={{ true: ORANGE, false: t.fill2 }} accessibilityLabel="Shake to report a problem" />
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            Shake your phone anywhere in the app to come here. It asks first.
          </Text>
        </View>
        <FormError message={error} />
      </ScrollView>
      <PrimaryButton label="Send" onPress={send} busy={busy} disabled={!body.trim()} style={{ marginTop: 14 }} />
    </View>
  );
}
