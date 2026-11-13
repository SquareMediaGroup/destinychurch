// Schedule a message to go out later (leaders and admins). Opened from holding
// Send in the composer, from the Poll screen, from the Scheduled list's
// "Schedule a message", or from the list to change one that is waiting
// (?jobId=). The message can be text, a photo (with or without text), an event
// card, or a poll. Nothing is sent now: the server sends it at the chosen time,
// checking everything again then.

import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { MAX_MESSAGE_LENGTH, MAX_SCHEDULE_DAYS, MIN_SCHEDULE_LEAD_MS, validatePollDeadline, validateScheduleTime, type D1EventSummary, type D1ScheduledMessage } from "@destiny/shared";
import { EventRow } from "@/components/EventRow";
import { Icon } from "@/components/Icon";
import { WhenPicker } from "@/components/WhenPicker";
import { Card, Field, FieldLabel, FormError, ModalForm, ModalHeader, PrimaryButton, TextButton } from "@/components/ui";
import { api } from "@/lib/api";
import { cleanImage } from "@/lib/cleanImage";
import { formatUkTime } from "@/lib/format";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { uploadAttachment } from "@/lib/upload";
import { dataSettings } from "@/state/dataSettings";
import { eventPick, useEventPick } from "@/state/eventPick";
import { scheduleDraft } from "@/state/scheduleDraft";
import { errorMessage } from "@/state/session";
import { useTheme } from "@/theme/tokens";

const DAY_MS = 86_400_000;

/** Where the event picker hands its choice when it was opened from here (not the chat underneath). */
export const scheduleEventTarget = (groupId: string) => `schedule:${groupId}`;

/** A sensible first time: the next 09:00 at least an hour away. */
function defaultTime(): Date {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setHours(9, 0, 0, 0);
  if (d.getTime() < Date.now() + 60 * 60_000) d.setDate(d.getDate() + 1);
  return d;
}

type Photo = { uri: string; name: string; mimeType: string };

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
  // What the composer or Poll screen handed over; none when opened from the Scheduled list.
  const draft = useMemo(() => (editing === null ? scheduleDraft.take(id) : null), [editing, id]);
  const poll = existing ? existing.poll : draft?.poll ?? null;

  const [text, setText] = useState<string | null>(null);
  const body = text ?? (existing ? existing.body ?? "" : draft?.body ?? "");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [picked, setPicked] = useState<Date | null>(null);
  const when = picked ?? (existing ? new Date(existing.runAt) : defaultTime());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An event chosen on the picker, addressed to this screen (the store holds it until it is removed or sent).
  const event: D1EventSummary | null = useEventPick(scheduleEventTarget(id));
  const setEvent = (e: null) => (e === null ? eventPick.clear() : undefined);
  // Leaving the screen forgets an event that wasn't scheduled.
  useEffect(() => () => eventPick.clear(), []);

  // Text, a photo and an event can be changed only on a new message; on one already waiting, its time and text.
  const composing = editing === null && !poll;
  const hasContent = !!poll || !!body.trim() || !!photo || !!event || !!existing?.attachmentId || !!existing?.event;
  const check = validateScheduleTime(when);
  const pollCheck = poll?.closesAt ? validatePollDeadline(new Date(poll.closesAt), when) : null;
  const problem = !hasContent
    ? "Write a message, or add a photo or an event."
    : !check.ok
      ? check.reason
      : pollCheck && !pollCheck.ok
        ? `${pollCheck.reason} Change when it closes on the Poll screen, or send it later.`
        : null;

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    const a = res.canceled ? null : res.assets[0];
    if (!a) return;
    try {
      // Re-encoded on the phone, like any photo sent in a chat, so no location or other hidden details go with it.
      const clean = await cleanImage(a.uri, a.fileName ?? "Photo.jpg", a.mimeType ?? "image/jpeg", { quality: dataSettings.get().uploadQuality });
      setPhoto({ uri: clean.uri, name: clean.name, mimeType: clean.mimeType });
      setEvent(null); // one or the other
    } catch {
      setError("Couldn't prepare that photo. Try another one.");
    }
  }

  async function save() {
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      const trimmed = body.trim() || null;
      if (editing !== null) {
        const textChanged = existing && !existing.poll && trimmed !== (existing.body ?? null);
        await api.updateScheduledMessage(id, editing, { runAt: when.toISOString(), ...(textChanged ? { body: trimmed } : {}) });
      } else {
        // The photo is uploaded now and held until it is sent. Only photos: voice notes and videos send straight away.
        const attachmentId = photo ? await uploadAttachment(id, { uri: photo.uri, name: photo.name, mimeType: photo.mimeType, size: null }) : null;
        await api.scheduleMessage(id, {
          runAt: when.toISOString(),
          body: poll ? null : trimmed,
          // Mentions were worked out from the composer's text; if it was changed here they may not match any more.
          mentions: draft && trimmed === (draft.body ?? null) ? draft.mentions : null,
          poll,
          attachmentId,
          event: event ? { seriesKey: event.seriesKey, slug: event.slug } : null,
        });
        if (draft) scheduleDraft.done(id);
        else scheduleDraft.clear();
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

  const canEditText = !poll && (editing === null || (existing && !existing.attachmentId && !existing.event) || !!existing?.body);

  return (
    <ModalForm>
      <ModalHeader title={editing !== null ? "Scheduled message" : "Schedule"} />
      <ScrollView contentContainerStyle={{ gap: 18, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        {poll ? (
          <Card>
            <Text numberOfLines={6} style={{ fontSize: 16, lineHeight: 22, color: t.text, padding: 16 }}>{`Poll: ${poll.question}`}</Text>
          </Card>
        ) : null}

        {canEditText ? (
          <View style={{ gap: 8 }}>
            <FieldLabel>Message</FieldLabel>
            <Field value={body} onChangeText={setText} placeholder={photo || event ? "Add a caption (optional)" : "What would you like to say?"} background={t.card} multiline maxLength={MAX_MESSAGE_LENGTH} />
          </View>
        ) : null}

        {existing?.attachmentId ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
            <Icon name="photo" size={18} color={t.muted} />
            <Text style={{ fontSize: 16, color: t.text }}>Photo</Text>
          </Card>
        ) : null}
        {existing?.event ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
            <Icon name="calendar" size={18} color={t.muted} />
            <Text style={{ fontSize: 16, color: t.text }}>Event card</Text>
          </Card>
        ) : null}

        {composing ? (
          photo ? (
            <View style={{ gap: 8 }}>
              <Image source={{ uri: photo.uri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: t.fill }} resizeMode="cover" accessibilityLabel="The photo to send" />
              <TextButton label="Remove photo" onPress={() => setPhoto(null)} color={t.muted} />
            </View>
          ) : event ? (
            <View style={{ gap: 8 }}>
              <EventRow event={event} onPress={() => router.push({ pathname: "/group/[id]/event-picker", params: { id, for: "schedule" } })} />
              <TextButton label="Remove event" onPress={() => setEvent(null)} color={t.muted} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AddButton icon="photo" label="Add photo" onPress={() => void pickPhoto()} />
              <AddButton icon="calendar" label="Add event" onPress={() => router.push({ pathname: "/group/[id]/event-picker", params: { id, for: "schedule" } })} />
            </View>
          )
        ) : null}

        <Card>
          <WhenPicker value={when} onChange={setPicked} minimumDate={range.min} maximumDate={range.max} />
        </Card>
        <Text style={{ fontSize: 14, lineHeight: 19, color: t.muted, paddingHorizontal: 4 }}>
          {`It will be sent on ${formatUkTime(when)} (UK time), in your name, as long as the group is still open and you can still post there. You can change or delete it until then. Up to ${MAX_SCHEDULE_DAYS} days ahead.`}
        </Text>
        <FormError live message={error ?? (hasContent ? problem : null)} />
      </ScrollView>
      <PrimaryButton label={editing !== null ? "Save" : "Schedule"} busy={busy} disabled={!!problem || (editing !== null && !existing)} onPress={() => void save()} style={{ marginTop: 14 }} />
      {existing ? (
        <View style={{ alignItems: "center", paddingTop: 12 }}>
          <Text accessibilityRole="button" onPress={() => void remove(existing)} style={{ fontSize: 17, color: t.tint }}>Delete</Text>
        </View>
      ) : null}
    </ModalForm>
  );
}

function AddButton({ icon, label, onPress }: { icon: "photo" | "calendar"; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pressed ? t.fill2 : t.card })}>
      <Icon name={icon} size={18} color={t.tint} />
      <Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>{label}</Text>
    </Pressable>
  );
}
