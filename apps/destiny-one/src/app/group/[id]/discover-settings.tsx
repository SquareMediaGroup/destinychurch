// How this group appears in Discover groups (leaders): on or off, a one-line
// description, the day it meets and the area. Whether under-18s can find it is
// not here: only a safeguarding admin decides that.

import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MAX_DISCOVER_AREA, MAX_DISCOVER_BLURB, WEEKDAYS } from "@destiny/shared";
import { Card, Field, FieldLabel, FormError, ModalForm, ModalHeader, PickRow, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";
import type { D1GroupDetail } from "@destiny/shared";

export default function DiscoverSettings() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const current = queryClient.getQueryData<D1GroupDetail>(keys.group(id))?.discover;
  const [on, setOn] = useState(current?.on ?? false);
  const [blurb, setBlurb] = useState(current?.blurb ?? "");
  const [day, setDay] = useState<number | null>(current?.meetingDay ?? null);
  const [area, setArea] = useState(current?.meetingArea ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.setDiscover(id, { on, blurb: blurb.trim() || null, meetingDay: day, meetingArea: area.trim() || null });
      void queryClient.invalidateQueries({ queryKey: keys.group(id) });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save that. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalForm>
      <ModalHeader title="Discover groups" />
      <ScrollView contentContainerStyle={{ gap: 18, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ flex: 1, fontSize: 17, color: t.text }}>Show in Discover</Text>
            <Switch value={on} onValueChange={setOn} trackColor={{ true: ORANGE, false: t.fill2 }} accessibilityLabel="Show in Discover" />
          </Card>
          <Text style={{ paddingHorizontal: 16, fontSize: 13, lineHeight: 18, color: t.subtle }}>
            Members of your community can see the group and ask to join. You approve each request.
            {current?.u18Suitable ? " Under-18s can see it too: a safeguarding admin has marked it suitable for them." : " Under-18s can't see it: only a safeguarding admin can mark a group suitable for them."}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>One-line description</FieldLabel>
          <Field value={blurb} onChangeText={setBlurb} placeholder="Dinner, worship and a short study" background={t.card} maxLength={MAX_DISCOVER_BLURB} />
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>Meets on</FieldLabel>
          <Card>
            <PickRow label="It varies" on={day === null} onPress={() => setDay(null)} />
            {WEEKDAYS.map((w, i) => (
              <View key={w}>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} />
                <PickRow label={w} on={day === i + 1} onPress={() => setDay(i + 1)} />
              </View>
            ))}
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <FieldLabel>Area</FieldLabel>
          <Field value={area} onChangeText={setArea} placeholder="Where it meets, e.g. Bearsden" background={t.card} maxLength={MAX_DISCOVER_AREA} />
        </View>
        <FormError message={error} />
      </ScrollView>
      <PrimaryButton label="Save" busy={busy} onPress={() => void save()} style={{ marginTop: 14 }} />
    </ModalForm>
  );
}
