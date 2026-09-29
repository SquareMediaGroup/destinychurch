// Change your own first and last name. Shown to other members in chats and
// visible to the church safeguarding team, so it should be your real name.

import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { AuthScreen } from "@/components/AuthScreen";
import { Field, FieldLabel, FormError, LargeTitle, Lead, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { errorMessage, useSession } from "@/state/session";

export default function EditName() {
  const { me, setMe } = useSession();
  const [firstName, setFirstName] = useState(me?.firstName ?? "");
  const [lastName, setLastName] = useState(me?.lastName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = firstName.trim().length > 0 && lastName.trim().length > 0;

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
        <Lead>Other members and the church safeguarding team see this. Please use your real name.</Lead>
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
          autoFocus
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
          onSubmitEditing={save}
          inputStyle={{ minHeight: 56 }}
        />
        <FormError message={error} />
      </View>
    </AuthScreen>
  );
}
