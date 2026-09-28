// A6 Waiting for approval, A7 Invite-only and A8 Suspended — one screen, the
// copy comes from the server (me.onboardingMessage). Re-checks on foreground
// (SessionProvider) and moves on as soon as the member is approved.

import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Icon } from "@/components/Icon";
import { Lead, SecondaryButton, TextButton } from "@/components/ui";
import { routeFor, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const TITLES = { request_submitted: "Request sent", invite_only: "Invite needed", suspended: "Account on hold" } as const;
const FALLBACK = {
  request_submitted: "Thanks. The church office will check your request and let you know. This usually takes a day or two.",
  invite_only: "Destiny One is invite-only. Ask your team leader or the church office for an invite.",
  suspended: "Please speak to the church office.",
} as const;

export default function Waiting() {
  const t = useTheme();
  const { me, signOut } = useSession();
  const state = me && me.onboarding in TITLES ? (me.onboarding as keyof typeof TITLES) : "request_submitted";

  useEffect(() => {
    if (me && !(me.onboarding in TITLES)) router.replace(routeFor(me));
  }, [me]);

  return (
    <AuthScreen
      footer={
        <>
          {state === "request_submitted" ? <SecondaryButton label="Edit my request" onPress={() => router.push("/request")} /> : null}
          <TextButton label="Sign out" onPress={() => void signOut().then(() => router.replace("/"))} style={{ alignSelf: "center", paddingVertical: 12 }} />
        </>
      }
    >
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: t.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name={state === "request_submitted" ? "clock" : "mail"} size={34} color={t.tint} strokeWidth={1.8} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", letterSpacing: 0.2, color: t.text }}>{TITLES[state]}</Text>
        <Lead style={{ textAlign: "center", maxWidth: 300 }}>{me?.onboardingMessage ?? FALLBACK[state]}</Lead>
      </View>
    </AuthScreen>
  );
}
