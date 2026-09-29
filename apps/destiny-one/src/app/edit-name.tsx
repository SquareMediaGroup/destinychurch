// Change your own first and last name (twice in any 30 days). Shown to other
// members in chats, with a live preview of a message from you.

import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Avatar, Field, FieldLabel, FormError, LargeTitle, Lead, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { errorMessage, useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

/** How the name looks to other members: a message from you, as it appears in a group chat. */
function MessagePreview({ name }: { name: string }) {
  const t = useTheme();
  const shown = name.trim() || "Your name";
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: t.muted, paddingHorizontal: 4 }}>How others will see it</Text>
      <View accessible accessibilityLabel={`Preview: a message from ${shown}`} style={{ borderRadius: 20, backgroundColor: t.card, paddingVertical: 16, paddingRight: 56, paddingLeft: 12, flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
        <Avatar name={shown} size={30} />
        <View style={{ flexShrink: 1, alignItems: "flex-start", gap: 3 }}>
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: t.muted, paddingHorizontal: 12 }}>{shown}</Text>
          <View style={{ borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: t.bubbleIn, paddingTop: 8, paddingBottom: 9, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: t.text }}>Hi everyone, see you on Sunday!</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function EditName() {
  const { me, setMe } = useSession();
  const t = useTheme();
  const [firstName, setFirstName] = useState(me?.firstName ?? "");
  const [lastName, setLastName] = useState(me?.lastName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const left = me?.nameChangesLeft ?? 0;
  const locked = left === 0;
  const unchanged = firstName.trim() === me?.firstName && lastName.trim() === me?.lastName;
  const ready = !locked && !unchanged && firstName.trim().length > 0 && lastName.trim().length > 0;
  const nextDate = me?.nextNameChangeAt ? new Date(me.nextNameChangeAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : null;

  async function save() {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      setMe(await api.updateName(firstName.trim(), lastName.trim()));
      haptic.success();
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen back footer={<PrimaryButton label="Save name" onPress={save} busy={busy} disabled={!ready} />}>
      <View style={{ paddingTop: 14, paddingHorizontal: 4, gap: 8 }}>
        <LargeTitle>Your name</LargeTitle>
        <Lead>This is the name shown to other members of Destiny Church when you send a message. Please use your real name.</Lead>
      </View>
      <View style={{ marginTop: 28, gap: 10 }}>
        <FieldLabel>First name</FieldLabel>
        <Field
          value={firstName}
          onChangeText={(v) => {
            setFirstName(v);
            setError(null);
          }}
          placeholder="First name"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          maxLength={80}
          editable={!locked}
          autoFocus={!locked}
          inputStyle={{ minHeight: 56 }}
        />
        <FieldLabel>Last name</FieldLabel>
        <Field
          value={lastName}
          onChangeText={(v) => {
            setLastName(v);
            setError(null);
          }}
          placeholder="Last name"
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="done"
          maxLength={80}
          editable={!locked}
          onSubmitEditing={save}
          inputStyle={{ minHeight: 56 }}
        />
        <FormError message={error} />
        <Text style={{ fontSize: 13, lineHeight: 18, color: t.muted, paddingHorizontal: 4 }}>
          {locked
            ? `You have used both name changes for this month. You can change your name again on ${nextDate}.`
            : `You can change your name twice a month. You have ${left} ${left === 1 ? "change" : "changes"} left.`}
        </Text>
      </View>
      <View style={{ marginTop: 24 }}>
        <MessagePreview name={`${firstName} ${lastName}`} />
      </View>
    </AuthScreen>
  );
}
