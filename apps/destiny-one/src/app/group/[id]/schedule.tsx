// Schedule a message to go out later (leaders and admins). Opened from holding
// Send in the composer, from the Poll screen, or from the Scheduled list to
// change one that is waiting (?jobId=). Nothing is sent now: the server sends it
// at the chosen time, checking everything again then.

import { useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MAX_SCHEDULE_DAYS, MIN_SCHEDULE_LEAD_MS, validatePollDeadline, validateScheduleTime, type D1ScheduledMessage } from "@destiny/shared";
import { WhenPicker } from "@/components/WhenPicker";
import { Card, FormError, ModalForm, ModalHeader, PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { formatUkTime } from "@/lib/format";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { scheduleDraft } from "@/state/scheduleDraft";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const DAY_MS = 86_400_000;

/** A sensible first time: the next 09:00 at least an hour away. */
function defaultTime(): Date {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setHours(9, 0, 0, 0);
  if (d.getTime() < Date.now() + 60 * 60_000) d.setDate(d.getDate() + 1);
  return d;
}

export default function Schedule() {
  const t = useTheme();
  const { id, jobId } = useLocalSearchParams<{ id: string; jobId?: string }>();
  const editing = jobId ? Number(jobId) : null;

  const waiting = useQuery({ queryKey: keys.scheduled(id), queryFn: () => api.scheduledMessages(id), enabled: editing !== null, staleTime: 15_000 });
  const existing = editing !== null ? waiting.data?.find((m) => m.id === editing) : undefined;

  // The window is fixed when the screen opens, so the picker doesn't shift under a finger.
  const [range] = useState(() => {
    const now = Date.now();
    return { min: new Date(now + MIN_SCHEDULE_LEAD_MS + 30_000), max: new Date(now + MAX_SCHEDULE_DAYS * DAY_MS) };
  });
  const draft = useMemo(() => (editing === null ? scheduleDraft.take(id) : null), [editing, id]);
  const [picked, setPicked] = useState<Date | null>(null);
  const when = picked ?? (existing ? new Date(existing.runAt) : defaultTime());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const body = existing ? existing.body : draft?.body ?? null;
  const poll = existing ? existing.poll : draft?.poll ?? null;
  const check = validateScheduleTime(when);
  const pollCheck = poll?.closesAt ? validatePollDeadline(new Date(poll.closesAt), when) : null;
  const problem = !check.ok ? check.reason : pollCheck && !pollCheck.ok ? `${pollCheck.reason} Change when it closes on the Poll screen, or send it later.` : null;

  async function save() {
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      if (editing !== null) {
        await api.updateScheduledMessage(id, editing, { runAt: when.toISOString() });
      } else if (draft) {
        await api.scheduleMessage(id, { runAt: when.toISOString(), body: draft.body, mentions: draft.mentions, poll: draft.poll });
        scheduleDraft.done(id);
      }
      void queryClient.invalidateQueries({ queryKey: keys.scheduled(id) });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Couldn't schedule it. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: D1ScheduledMessage) {
    Alert.alert("Delete this scheduled message?", "It won't be sent.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteScheduledMessage(id, item.id);
            void queryClient.invalidateQueries({ queryKey: keys.scheduled(id) });
            router.back();
          } catch (err) {
            Alert.alert("Couldn't delete it", errorMessage(err));
          }
        },
      },
    ]);
  }

  const nothing = editing === null && !draft;
  const preview = poll ? `Poll: ${poll.question}` : body ?? (existing?.attachmentId ? "Photo" : existing?.event ? "Event" : "");

  return (
    <ModalForm>
      <ModalHeader title={editing !== null ? "Scheduled message" : "Schedule"} />
      <ScrollView contentContainerStyle={{ gap: 18, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        {nothing ? (
          <Text style={{ fontSize: 16, color: t.muted, paddingHorizontal: 4 }}>There&apos;s nothing to schedule. Write a message, then hold Send.</Text>
        ) : (
          <>
            <Card>
              <Text numberOfLines={6} style={{ fontSize: 16, lineHeight: 22, color: t.text, padding: 16 }}>{preview}</Text>
            </Card>
            <Card>
              <WhenPicker value={when} onChange={setPicked} minimumDate={range.min} maximumDate={range.max} />
            </Card>
            <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted, paddingHorizontal: 4 }}>
              {`It will be sent on ${formatUkTime(when)} (UK time), in your name, as long as the group is still open and you can still post there. You can change or delete it until then. Up to ${MAX_SCHEDULE_DAYS} days ahead.`}
            </Text>
            <FormError live message={error ?? problem} />
          </>
        )}
      </ScrollView>
      {!nothing ? <PrimaryButton label={editing !== null ? "Save time" : "Schedule"} busy={busy} disabled={!!problem || (editing !== null && !existing)} onPress={() => void save()} style={{ marginTop: 14 }} /> : null}
      {existing ? (
        <View style={{ alignItems: "center", paddingTop: 12 }}>
          <Text accessibilityRole="button" onPress={() => void remove(existing)} style={{ fontSize: 17, color: t.tint }}>Delete</Text>
        </View>
      ) : null}
    </ModalForm>
  );
}
