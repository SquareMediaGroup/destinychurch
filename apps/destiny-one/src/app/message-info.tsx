// Message info ("Seen by"), from Info in the message menu: who has read one
// of my messages and who hasn't yet. Group managers can open it on any
// message (handy for announcements). People with read receipts turned off
// are counted, never named. A sheet; fetched fresh each time it opens.
//
// Params: groupId, messageId.

import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { D1ReadReceipts } from "@destiny/shared";
import { Avatar, Card, ModalHeader, SectionLabel, TextButton } from "@/components/ui";
import { api } from "@/lib/api";
import { clock, dayLabel, messageSummary, plural } from "@/lib/format";
import { useMessages } from "@/lib/queries";
import { errorMessage, useSession } from "@/state/session";
import { ORANGE, useTheme } from "@/theme/tokens";

export default function MessageInfo() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { me } = useSession();
  const { groupId, messageId } = useLocalSearchParams<{ groupId: string; messageId: string }>();
  const message = useMessages(groupId).data?.messages.find((m) => m.id === Number(messageId)) ?? null;
  const [receipts, setReceipts] = useState<D1ReadReceipts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me?.readReceipts === false) return;
    let live = true;
    api.receipts(Number(messageId)).then(
      (r) => live && setReceipts(r),
      (err) => live && setError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [messageId, me?.readReceipts]);

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: insets.top, paddingHorizontal: 16 }}>
      <ModalHeader title="Message info" />
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingBottom: insets.bottom + 30, gap: 20 }}>
        {message ? (
          <Card style={{ padding: 14, gap: 4 }}>
            <Text numberOfLines={4} style={{ fontSize: 16, lineHeight: 21, color: t.text }}>
              {messageSummary(message)}
            </Text>
            <Text style={{ fontSize: 13, color: t.muted }}>
              Sent {dayLabel(message.createdAt)}, {clock(message.createdAt)}
              {message.editedAt ? ". Edited" : ""}
            </Text>
          </Card>
        ) : null}

        {me?.readReceipts === false ? (
          <Card style={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 15, lineHeight: 21, color: t.muted }}>
              Read receipts are off, so you can&apos;t see who has read messages, and no one can see whether you&apos;ve read theirs.
            </Text>
            <TextButton
              label="Turn on in Profile"
              onPress={() => {
                router.back();
                router.push("/(tabs)/profile");
              }}
            />
          </Card>
        ) : error ? (
          <Text style={{ paddingHorizontal: 4, fontSize: 15, color: t.muted }}>{error}</Text>
        ) : !receipts ? (
          <ActivityIndicator color={ORANGE} style={{ marginTop: 20 }} />
        ) : (
          <>
            <People title={`Read by ${receipts.read.length}`} people={receipts.read} empty="No one yet." />
            <People title={`Not read yet${receipts.notYet.length ? ` (${receipts.notYet.length})` : ""}`} people={receipts.notYet} empty="Everyone has read it." />
            {receipts.hidden ? (
              <Text style={{ paddingHorizontal: 16, fontSize: 13, color: t.subtle }}>
                {plural(receipts.hidden, "person has", "people have")} read receipts turned off.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function People({ title, people, empty }: { title: string; people: { id: string; displayName: string }[]; empty: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <SectionLabel>{title}</SectionLabel>
      <Card>
        {people.length === 0 ? (
          <Text style={{ padding: 16, fontSize: 15, color: t.muted }}>{empty}</Text>
        ) : (
          people.map((p, i) => (
            <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 16 }}>
              <Avatar name={p.displayName} size={34} />
              <Text numberOfLines={1} style={{ flex: 1, paddingVertical: 12, paddingRight: 16, fontSize: 17, color: t.text, borderBottomWidth: i < people.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: t.sep }}>
                {p.displayName}
              </Text>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
