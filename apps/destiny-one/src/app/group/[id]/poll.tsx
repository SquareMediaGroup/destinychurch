// Compose a poll to send into the chat. Sending happens back on the group
// screen (state/pollDraft.ts) once this screen hands back a valid draft.

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MAX_POLL_DEADLINE_DAYS, MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, validatePoll, validatePollDeadline, type D1GroupDetail, type D1PollDraft } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { WhenPicker } from "@/components/WhenPicker";
import { Card, Field, FieldLabel, FormError, ModalHeader, ModalForm, PickRow, PrimaryButton, SectionLabel, TextButton } from "@/components/ui";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";
import { pollDraft } from "@/state/pollDraft";
import { scheduleDraft } from "@/state/scheduleDraft";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

type Closes = "never" | "hour" | "today" | "tomorrow" | "pick";
const CLOSES: { key: Closes; label: string }[] = [
  { key: "never", label: "No deadline" },
  { key: "hour", label: "In 1 hour" },
  { key: "today", label: "End of today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "pick", label: "Choose a day and time" },
];

/** When a deadline choice means, worked out when the button is pressed (so "in 1 hour" is an hour from then). */
function closeTime(choice: Closes, picked: Date): Date | null {
  const now = Date.now();
  switch (choice) {
    case "never":
      return null;
    case "hour":
      return new Date(now + 3_600_000);
    case "today": {
      const d = new Date(now);
      d.setHours(23, 59, 0, 0);
      return d;
    }
    case "tomorrow":
      return new Date(now + 86_400_000);
    case "pick":
      return picked;
  }
}

export default function Poll() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLeader } = useSession();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [closes, setClosesChoice] = useState<Closes>("never");
  const [picked, setPicked] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(18, 0, 0, 0);
    return d;
  });
  const [range] = useState(() => ({ min: new Date(Date.now() + 120_000), max: new Date(Date.now() + MAX_POLL_DEADLINE_DAYS * 86_400_000) }));
  const [pinResult, setPinResult] = useState(false);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  // Pinning the result is for group admins and leaders; so is scheduling the poll for later.
  const group = queryClient.getQueryData<D1GroupDetail>(keys.group(id));
  const canManage = !!group?.canManage || group?.myRole === "admin" || isLeader;
  const canSchedule = canManage && !!group?.canPost;

  const draft = { question, options, allowMultiple };
  const check = validatePoll(draft);

  function setCloses(choice: Closes) {
    setClosesChoice(choice);
    setDeadlineError(null);
  }

  /** The poll as it will be sent, with its deadline; null (and a message) if the deadline isn't one the server will take. */
  function build(opensAt: Date): D1PollDraft | null {
    const when = closeTime(closes, picked);
    if (when) {
      const ok = validatePollDeadline(when, opensAt);
      if (!ok.ok) {
        setDeadlineError(ok.reason);
        return null;
      }
    }
    setDeadlineError(null);
    // validatePoll ignores empty options, but the server refuses them: send only the filled-in ones.
    return {
      ...draft,
      options: options.map((o) => o.trim()).filter(Boolean),
      closesAt: when ? when.toISOString() : null,
      pinResult: when !== null && pinResult && canManage,
    };
  }

  function setOption(i: number, value: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function send() {
    if (!check.ok) return;
    const built = build(new Date());
    if (!built) return;
    pollDraft.set(id, built);
    router.back();
  }

  /** Not sent now: the Schedule screen picks the time (and checks the deadline comes after it). */
  function schedule() {
    if (!check.ok) return;
    const built = build(new Date());
    if (!built) return;
    scheduleDraft.set({ groupId: id, body: null, mentions: null, poll: built });
    router.replace(`/group/${id}/schedule`);
  }

  return (
    <ModalForm>
      <ModalHeader title="Poll" />
      <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <FieldLabel>Question</FieldLabel>
          <Field value={question} onChangeText={setQuestion} placeholder="What should we ask?" background={t.card} />
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>Options</SectionLabel>
          <Card>
            {options.map((value, i) => (
              <View key={i}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }}>
                  <Field
                    value={value}
                    onChangeText={(v) => setOption(i, v)}
                    placeholder={`Option ${i + 1}`}
                    background={t.card}
                    containerStyle={{ flex: 1 }}
                  />
                  {options.length > MIN_POLL_OPTIONS ? (
                    <Pressable onPress={() => removeOption(i)} accessibilityLabel={`Remove option ${i + 1}`} hitSlop={8}>
                      <Icon name="close" size={14} color={t.subtle} strokeWidth={2.6} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
          {options.length < MAX_POLL_OPTIONS ? <TextButton label="Add option" onPress={() => setOptions((prev) => [...prev, ""])} /> : null}
        </View>

        <View style={{ gap: 8 }}>
          <Card>
            <PickRow label="Allow selecting more than one option" on={allowMultiple} onPress={() => setAllowMultiple((v) => !v)} />
          </Card>
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>Closes</SectionLabel>
          <Card>
            {CLOSES.map((c, i) => (
              <View key={c.key}>
                {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} /> : null}
                <PickRow label={c.label} on={closes === c.key} onPress={() => setCloses(c.key)} />
              </View>
            ))}
            {closes === "pick" ? (
              <>
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.sep, marginLeft: 16 }} />
                <WhenPicker label="Closes at" value={picked} onChange={(d) => { setPicked(d); setDeadlineError(null); }} minimumDate={range.min} maximumDate={range.max} />
              </>
            ) : null}
          </Card>
          {closes !== "never" && canManage ? (
            <Card>
              <PickRow label="Pin the result when it closes" on={pinResult} onPress={() => setPinResult((v) => !v)} />
            </Card>
          ) : null}
        </View>

        <FormError live message={deadlineError ?? (!check.ok && (question || options.some(Boolean)) ? check.reason : null)} />
      </ScrollView>
      <PrimaryButton label="Send" onPress={send} disabled={!check.ok} style={{ marginTop: 14 }} />
      {canSchedule ? <TextButton label="Schedule for later" onPress={schedule} style={{ alignSelf: "center", marginTop: 12 }} /> : null}
    </ModalForm>
  );
}
