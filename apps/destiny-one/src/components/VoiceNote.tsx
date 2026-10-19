// Voice notes: recording one in the composer, and playing one in a bubble.
//
// Recording works like WhatsApp: hold the microphone to record and let go to
// send, slide left to cancel, slide up to lock it hands-free (then Send and
// the bin appear). A quick tap just shows a hint. It stops by itself at
// MAX_VOICE_MS. Mono AAC at 64 kbps in an .m4a file (audio/mp4): about 0.5 MB
// a minute, and plays on every phone. Anything under a second is thrown away
// (a mis-tap, not a message). The gesture lives in the composer; this file is
// the recorder and what the text field shows while it runs.
//
// Playing: nothing loads until Play is tapped (a chat can have dozens), and
// only one voice note plays at a time across the app.

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { useIsPreview } from "expo-router";
import { Alert, Animated, Linking, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, type AudioPlayer } from "expo-audio";
import { MAX_VOICE_MS, VOICE_MIME_TYPE } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { PressableScale } from "@/components/Motion";
import { haptic } from "@/lib/haptics";
import { ORANGE, useTheme } from "@/theme/tokens";

const VOICE_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };
const MIN_VOICE_MS = 1000;

export interface RecordedVoice {
  uri: string;
  name: string;
  mimeType: typeof VOICE_MIME_TYPE;
  size: null;
  durationMs: number;
}

/** "0:07", "1:42" */
export function voiceTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface VoiceRecorderHandle {
  /** Stop. `send` true hands the recording to onDone; false throws it away. */
  finish: (send: boolean) => Promise<void>;
}

/**
 * What the text field shows while recording: a red dot, the running time and,
 * while the finger is still down, "Slide to cancel" (which follows the finger
 * via `slideX`). Once `locked` it shows the bin instead. Starts recording as
 * soon as it appears; `onDone` gets the file (send) or null (cancelled, too
 * short, or the microphone isn't allowed).
 */
export function VoiceRecorder({ onDone, controlRef, locked, slideX }: { onDone: (voice: RecordedVoice | null) => void; controlRef: Ref<VoiceRecorderHandle>; locked: boolean; slideX: Animated.Value }) {
  const t = useTheme();
  const recorder = useAudioRecorder(VOICE_OPTIONS);
  const state = useAudioRecorderState(recorder, 250);
  const finished = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        finished.current = true;
        Alert.alert("Microphone is off", "Allow Destiny One to use the microphone in Settings to record a voice message.", [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ]);
        onDone(null);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (cancelled || finished.current) return;
      recorder.record();
      haptic.press();
    })().catch(() => {
      finished.current = true;
      onDone(null);
    });
    return () => {
      cancelled = true;
      if (!finished.current) void recorder.stop().catch(() => undefined);
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
    // Runs once: it records from the moment it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(send: boolean) {
    if (finished.current) return;
    finished.current = true;
    const durationMs = state.durationMillis;
    await recorder.stop().catch(() => undefined);
    await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    const uri = recorder.uri;
    if (!send || !uri || durationMs < MIN_VOICE_MS) {
      haptic.selection();
      onDone(null);
      return;
    }
    haptic.sent();
    onDone({ uri, name: "Voice message.m4a", mimeType: VOICE_MIME_TYPE, size: null, durationMs: Math.min(durationMs, MAX_VOICE_MS) });
  }
  useImperativeHandle(controlRef, () => ({ finish }));

  // Stops (and sends) by itself at the limit.
  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_VOICE_MS) void finish(true);
  });

  return (
    <View style={{ flex: 1, minHeight: 33, flexDirection: "row", alignItems: "center", gap: 10 }}>
      {locked ? (
        <PressableScale onPress={() => void finish(false)} hitSlop={6} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Cancel voice message" style={{ width: 33, height: 33, marginLeft: -10, alignItems: "center", justifyContent: "center" }}>
          <Icon name="trash" size={19} color={t.muted} strokeWidth={2} />
        </PressableScale>
      ) : null}
      <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#E5372B", opacity: state.isRecording ? 1 : 0.4 }} />
      <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, fontVariant: ["tabular-nums"], color: t.text }}>
        {state.isRecording ? voiceTime(state.durationMillis) : "0:00"}
      </Text>
      <View style={{ flex: 1, alignItems: "center" }}>
        {locked ? (
          <Text style={{ fontSize: 12, color: t.subtle }}>{voiceTime(MAX_VOICE_MS)} max</Text>
        ) : (
          <Animated.View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              opacity: slideX.interpolate({ inputRange: [-110, 0], outputRange: [0, 1], extrapolate: "clamp" }),
              transform: [{ translateX: slideX.interpolate({ inputRange: [-110, 0], outputRange: [-50, 0], extrapolate: "clamp" }) }],
            }}
          >
            <Icon name="back" size={14} color={t.subtle} strokeWidth={2.4} />
            <Text style={{ fontSize: 15, color: t.subtle }}>Slide to cancel</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

let playing: AudioPlayer | null = null;

/** A voice note in a bubble: play/pause, a progress bar, the time. `url` null while it's still uploading. */
export function VoiceNote(props: { url: string | null; durationMs: number | null; color: string; track: string; fill: string }) {
  // A chat peek shows a static note: no audio player per note on every peek.
  return useIsPreview() ? <VoiceNoteStatic {...props} /> : <VoiceNotePlayer {...props} />;
}

function VoiceNoteStatic({ durationMs, color, track, fill }: { durationMs: number | null; color: string; track: string; fill: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 200, paddingVertical: 2 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: fill, alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
        <Icon name="play" size={16} color={color} strokeWidth={2.6} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: track }} />
        <Text style={{ fontSize: 12, fontVariant: ["tabular-nums"], color }}>{voiceTime(durationMs ?? 0)}</Text>
      </View>
    </View>
  );
}

function VoiceNotePlayer({ url, durationMs, color, track, fill }: { url: string | null; durationMs: number | null; color: string; track: string; fill: string }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status.didJustFinish) {
      void player.seekTo(0);
      player.pause();
    }
  }, [status.didJustFinish, player]);
  useEffect(
    () => () => {
      if (playing === player) playing = null;
    },
    [player],
  );

  async function toggle() {
    if (!url) return;
    haptic.selection();
    if (status.playing) {
      player.pause();
      return;
    }
    if (playing && playing !== player) playing.pause();
    playing = player;
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    if (!loaded) {
      player.replace({ uri: url });
      setLoaded(true);
    }
    player.play();
  }

  const total = status.duration > 0 ? status.duration * 1000 : durationMs ?? 0;
  const at = status.currentTime * 1000;
  const pct = total > 0 ? Math.min(1, at / total) : 0;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 200, paddingVertical: 2 }}>
      <PressableScale
        onPress={() => void toggle()}
        disabled={!url}
        scaleTo={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${status.playing ? "Pause" : "Play"} voice message, ${voiceTime(total)}`}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: fill, alignItems: "center", justifyContent: "center", opacity: url ? 1 : 0.5 }}
      >
        <Icon name={status.playing ? "pause" : "play"} size={16} color={color} strokeWidth={2.6} />
      </PressableScale>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: track, overflow: "hidden" }}>
          <View style={{ width: `${pct * 100}%`, height: 4, backgroundColor: color === "#FFFFFF" ? "#FFFFFF" : ORANGE }} />
        </View>
        <Text style={{ fontSize: 12, fontVariant: ["tabular-nums"], color }}>{status.playing || at > 0 ? `${voiceTime(at)} / ${voiceTime(total)}` : voiceTime(total)}</Text>
      </View>
    </View>
  );
}
