// Voice notes: recording one in the composer, and playing one in a bubble.
//
// Recording: tap the microphone (when the box is empty) and a bar takes the
// text field's place, with a red dot, the running time, Cancel and Send. It
// stops by itself at MAX_VOICE_MS. Mono AAC at 64 kbps in an .m4a file
// (audio/mp4): about 0.5 MB a minute, and plays on every phone. Anything under
// a second is thrown away (a mis-tap, not a message).
//
// Playing: nothing loads until Play is tapped (a chat can have dozens), and
// only one voice note plays at a time across the app.

import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, type AudioPlayer } from "expo-audio";
import { MAX_VOICE_MS, VOICE_MIME_TYPE } from "@destiny/shared";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { Appear, PressableScale } from "@/components/Motion";
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

/**
 * The recording bar. Starts recording as soon as it appears; `onDone` gets the
 * file (Send) or null (Cancel, too short, or the microphone isn't allowed).
 */
export function VoiceRecorder({ onDone }: { onDone: (voice: RecordedVoice | null) => void }) {
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
      if (cancelled) return;
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
    // Runs once: the bar records from the moment it opens.
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

  // Stops (and sends) by itself at the limit.
  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_VOICE_MS) void finish(true);
  });

  return (
    <Appear from={{ y: 10, scale: 0.97 }} style={{ flex: 1 }}>
      <GlassSurface style={{ minHeight: 41, borderRadius: 21.5, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 6, paddingRight: 4, paddingVertical: 4 }}>
        <PressableScale onPress={() => void finish(false)} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Cancel voice message" style={{ width: 33, height: 33, alignItems: "center", justifyContent: "center" }}>
          <Icon name="trash" size={19} color={t.muted} strokeWidth={2} />
        </PressableScale>
        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#E5372B", opacity: state.isRecording ? 1 : 0.4 }} />
        <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontSize: 17, fontVariant: ["tabular-nums"], color: t.text }}>
          {state.isRecording ? voiceTime(state.durationMillis) : "Starting..."}
        </Text>
        <Text style={{ fontSize: 12, color: t.subtle }}>{voiceTime(MAX_VOICE_MS)} max</Text>
        <PressableScale onPress={() => void finish(true)} hitSlop={6} scaleTo={0.82} accessibilityRole="button" accessibilityLabel="Send voice message" style={{ width: 33, height: 33, borderRadius: 17, backgroundColor: t.send, alignItems: "center", justifyContent: "center" }}>
          <Icon name="send" size={17} color={t.onSend} strokeWidth={2.8} />
        </PressableScale>
      </GlassSurface>
    </Appear>
  );
}

let playing: AudioPlayer | null = null;

/** A voice note in a bubble: play/pause, a progress bar, the time. `url` null while it's still uploading. */
export function VoiceNote({ url, durationMs, color, track, fill }: { url: string | null; durationMs: number | null; color: string; track: string; fill: string }) {
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
