// The message composer: attach (image or PDF, 20 MB) from files or the photo
// library, take a photo with the in-app camera (every image is re-encoded first so no
// location or other hidden details leave the phone: src/lib/cleanImage.ts), a
// glass text field, the reply bar,
// and the send button that swaps in for the attach shortcut once there's text.

import { forwardRef, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES, MAX_MESSAGE_LENGTH, mentionQuery, mentionSuggestions, type Mentionable } from "@destiny/shared";
import { AttachSheet } from "@/components/AttachSheet";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { takePhoto as openCamera } from "@/lib/camera";
import { Appear, PressableScale } from "@/components/Motion";
import { SendAsMenu } from "@/components/SendAsMenu";
import { VoiceRecorder, type VoiceRecorderHandle } from "@/components/VoiceNote";
import { Avatar } from "@/components/ui";
import type { Account } from "@/lib/accounts";
import { cleanImage } from "@/lib/cleanImage";
import { haptic } from "@/lib/haptics";
import { ORANGE, useTheme } from "@/theme/tokens";

/** How far (points) the finger slides left to cancel / up to lock, and what counts as a tap. */
const CANCEL_SLIDE = 110;
const LOCK_SLIDE = 70;
const TAP_MS = 400;

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  /** Voice notes: the length in milliseconds. */
  durationMs?: number;
}

interface Props {
  replying: { name: string; text: string } | null;
  onCancelReply: () => void;
  /**
   * Editing one of my messages: the box holds its text, Send becomes a tick
   * that saves it, and attaching is off. The parent remounts the composer
   * (a new `key`) going into and out of this, with `initialText` to match.
   */
  editing?: { text: string } | null;
  onCancelEdit?: () => void;
  onSend: (text: string) => void;
  onAttach: (file: PickedFile) => void;
  onAttachPoll: () => void;
  onAttachEvent: () => void;
  onError: (message: string) => void;
  /** Holding Send: which other signed-in accounts could send this instead. Omit to turn the hold off. */
  loadSendAsOptions?: () => Promise<Account[]>;
  /** The chosen account sends `text`. Resolves once sent, or throws. */
  onSendAs?: (account: Account, text: string) => Promise<void>;
  /** What's in the box when it opens (a saved draft). */
  initialText?: string;
  /** Every change to the text, so it can be kept as a draft. */
  onTextChange?: (text: string) => void;
  /** People who can be @mentioned (the group's other members). Typing "@" suggests them. */
  mentionables?: Mentionable[];
  /** Text only: no attach button and no voice notes (the chat with DestinyAI, which only reads text). */
  textOnly?: boolean;
  /** The empty box's hint. Defaults to "Message". */
  placeholder?: string;
}

export const Composer = forwardRef<TextInput, Props>(function Composer({ replying, onCancelReply, editing, onCancelEdit, onSend, onAttach, onAttachPoll, onAttachEvent, onError, loadSendAsOptions, onSendAs, initialText, onTextChange, mentionables, textOnly, placeholder = "Message" }, ref) {
  const t = useTheme();
  const [draft, setDraftState] = useState(initialText ?? "");
  const setDraft = (text: string) => {
    setDraftState(text);
    onTextChange?.(text);
  };
  const [sheetOpen, setSheetOpen] = useState(false);
  // Voice recording: "held" while the finger is down on the microphone,
  // "locked" once slid up (hands-free).
  const [recording, setRecording] = useState<null | "held" | "locked">(null);
  const recorder = useRef<VoiceRecorderHandle>(null);
  const slideX = useRef(new Animated.Value(0)).current;
  const hold = useRef({ at: 0, over: false });
  const mic = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        hold.current = { at: Date.now(), over: false };
        slideX.setValue(0);
        setRecording("held");
      },
      onPanResponderMove: (_e, g) => {
        if (hold.current.over) return;
        slideX.setValue(Math.min(0, g.dx));
        if (g.dx < -CANCEL_SLIDE) {
          // Slid away: cancel without waiting for the finger to lift.
          hold.current.over = true;
          void recorder.current?.finish(false);
        } else if (g.dy < -LOCK_SLIDE) {
          hold.current.over = true;
          haptic.tick();
          setRecording("locked");
        }
      },
      onPanResponderRelease: () => {
        if (hold.current.over) return;
        hold.current.over = true;
        if (Date.now() - hold.current.at < TAP_MS) onErrorRef.current("Hold to record, release to send.");
        void recorder.current?.finish(true);
      },
      // The system took the touch (a permission alert, a call): stop quietly.
      onPanResponderTerminate: () => {
        if (hold.current.over) return;
        hold.current.over = true;
        void recorder.current?.finish(false);
      },
    }),
  ).current;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  // Where the cursor is, to spot an "@name" being typed.
  const [cursor, setCursor] = useState(draft.length);
  const typing = mentionables?.length ? mentionQuery(draft, cursor) : null;
  const suggestions = typing ? mentionSuggestions(typing.query, mentionables ?? []) : [];

  /** Swap the "@par" being typed for the whole "@Name " and carry on. */
  function pickMention(person: Mentionable) {
    if (!typing) return;
    haptic.selection();
    const insert = `@${person.displayName} `;
    const next = (draft.slice(0, typing.start) + insert + draft.slice(cursor)).slice(0, MAX_MESSAGE_LENGTH);
    setDraft(next);
    setCursor(typing.start + insert.length);
  }
  const [sendAsMenu, setSendAsMenu] = useState<{ text: string; options: Account[]; checking: boolean } | null>(null);
  const hasText = draft.trim().length > 0;
  // While editing, Save only lights up once the text actually differs.
  const canSend = hasText && (!editing || draft.trim() !== editing.text.trim());

  async function acceptAsset(a: { uri: string; name: string; mimeType: string; size: number | null }) {
    if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(a.mimeType)) {
      onError("You can send photos and PDFs.");
      return;
    }
    if (a.mimeType.startsWith("image/")) {
      // A fresh copy with no hidden details (above all, no GPS location).
      try {
        const clean = await cleanImage(a.uri, a.name, a.mimeType);
        onAttach({ uri: clean.uri, name: clean.name, mimeType: clean.mimeType, size: null });
      } catch {
        onError("Couldn't prepare that photo. Try another one.");
      }
      return;
    }
    if (a.size != null && a.size > MAX_ATTACHMENT_BYTES) {
      onError("Files can be up to 20 MB.");
      return;
    }
    onAttach(a);
  }

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: [...ATTACHMENT_MIME_TYPES], copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    await acceptAsset({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? "", size: a.size ?? null });
  }

  function imagePickerAsset(a: ImagePicker.ImagePickerAsset, fallbackName: string) {
    const mimeType = a.mimeType ?? (a.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
    return acceptAsset({ uri: a.uri, name: a.fileName ?? fallbackName, mimeType, size: a.fileSize ?? null });
  }

  async function pickPhoto() {
    // No permission request: the system photo picker runs out of process and needs none.
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    await imagePickerAsset(res.assets[0], "Photo.jpg");
  }

  async function takePhoto() {
    // The in-app camera (src/app/camera.tsx) asks for permission itself.
    const uri = await openCamera();
    if (!uri) return;
    await acceptAsset({ uri, name: "Photo.jpg", mimeType: "image/jpeg", size: null });
  }

  /** Holding Send: offer the other signed-in accounts that can send this message. */
  async function openSendAs() {
    const text = draft.trim();
    if (!text || !loadSendAsOptions || !onSendAs) return;
    haptic.press();
    setSendAsMenu({ text, options: [], checking: true });
    const options = await loadSendAsOptions().catch(() => []);
    setSendAsMenu((menu) => (menu && menu.text === text ? { text, options, checking: false } : menu));
  }

  async function pickSendAs(account: Account) {
    const text = sendAsMenu?.text;
    setSendAsMenu(null);
    if (!text || !onSendAs) return;
    haptic.selection();
    try {
      await onSendAs(account, text);
      setDraft("");
      haptic.sent();
    } catch (err) {
      haptic.error();
      onError(`Couldn't send as ${account.displayName}. ${err instanceof Error ? err.message : ""}`.trim());
    }
  }

  function send() {
    const text = draft.trim();
    if (!text || !canSend) return;
    haptic.sent();
    onSend(text);
    setDraft("");
  }

  return (
    <View style={{ gap: 8 }}>
      {replying ? (
        <Appear key={`${replying.name}:${replying.text}`} from={{ y: 16, scale: 0.96 }}>
        <GlassSurface style={{ marginLeft: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 18 }}>
          <Icon name="reply" size={16} color={t.tint} strokeWidth={2.2} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.tint }}>Replying to {replying.name}</Text>
            <Text numberOfLines={1} style={{ fontSize: 14, color: t.muted }}>
              {replying.text}
            </Text>
          </View>
          <PressableScale onPress={onCancelReply} accessibilityLabel="Cancel reply" scaleTo={0.85} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={12} color={t.muted} strokeWidth={3} />
          </PressableScale>
        </GlassSurface>
        </Appear>
      ) : null}
      {editing ? (
        <Appear key="editing" from={{ y: 16, scale: 0.96 }}>
          <GlassSurface style={{ marginLeft: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 18 }}>
            <Icon name="pencil" size={16} color={t.tint} strokeWidth={2.2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: t.tint }}>Editing message</Text>
              <Text numberOfLines={1} style={{ fontSize: 14, color: t.muted }}>
                {editing.text}
              </Text>
            </View>
            <PressableScale onPress={onCancelEdit} accessibilityLabel="Cancel editing" scaleTo={0.85} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
              <Icon name="close" size={12} color={t.muted} strokeWidth={3} />
            </PressableScale>
          </GlassSurface>
        </Appear>
      ) : null}

      {suggestions.length ? (
        <Appear key="mentions" from={{ y: 12, scale: 0.97 }}>
          <GlassSurface style={{ marginLeft: 52, borderRadius: 18, paddingVertical: 4, overflow: "hidden" }}>
            {suggestions.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pickMention(p)}
                accessibilityRole="button"
                accessibilityLabel={`Mention ${p.displayName}`}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7, paddingHorizontal: 12, backgroundColor: pressed ? t.fill : "transparent" })}
              >
                <Avatar name={p.displayName} size={28} />
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: t.text }}>{p.displayName}</Text>
              </Pressable>
            ))}
          </GlassSurface>
        </Appear>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        {recording === "held" ? (
          <Appear key="lock-hint" from={{ y: 12, scale: 0.9 }} style={{ position: "absolute", right: 6, bottom: 64 }}>
            <GlassSurface style={{ width: 40, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="lock" size={17} color={t.text} strokeWidth={2} />
              <Icon name="updown" size={15} color={t.subtle} strokeWidth={2} />
            </GlassSurface>
          </Appear>
        ) : null}
        {textOnly ? null : <PressableScale
          onPress={() => {
            haptic.selection();
            setSheetOpen(true);
          }}
          disabled={!!editing}
          style={{ opacity: editing ? 0.35 : 1 }}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Add to message"
          accessibilityState={{ disabled: !!editing }}
        >
          {({ pressed }) => (
            <GlassSurface interactive style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 }, t.shadow]}>
              <Icon name="plus" size={22} color={t.text} />
            </GlassSurface>
          )}
        </PressableScale>}

        <View style={{ flex: 1 }}>
          <GlassSurface style={{ minHeight: 41, borderRadius: 21.5, flexDirection: "row", alignItems: "flex-end", gap: 6, paddingLeft: 16, paddingRight: 4, paddingVertical: 4 }}>
            {recording ? (
              <VoiceRecorder
                controlRef={recorder}
                locked={recording === "locked"}
                slideX={slideX}
                onDone={(voice) => {
                  setRecording(null);
                  slideX.setValue(0);
                  if (voice) onAttach(voice);
                }}
              />
            ) : null}
            <TextInput
              ref={ref}
              value={draft}
              onChangeText={(v) => setDraft(v.slice(0, MAX_MESSAGE_LENGTH))}
              onSelectionChange={(e) => setCursor(e.nativeEvent.selection.end)}
              placeholder={placeholder}
              placeholderTextColor={t.subtle}
              selectionColor={ORANGE}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              accessibilityLabel={placeholder}
              maxFontSizeMultiplier={1.6}
              style={recording ? { display: "none" } : { flex: 1, minHeight: 33, maxHeight: 140, fontSize: 17, color: t.text, paddingTop: 7, paddingBottom: 7 }}
            />
            {/* Send and the microphone trade places with a pop as the draft fills or empties. */}
            {editing ? (
              <Appear key="save" from={{ scale: 0.3 }}>
                <PressableScale onPress={send} disabled={!canSend} hitSlop={6} scaleTo={0.82} accessibilityRole="button" accessibilityLabel="Save edit" accessibilityState={{ disabled: !canSend }} style={{ width: 33, height: 33, borderRadius: 17, backgroundColor: canSend ? t.send : t.fill, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="check" size={17} color={canSend ? t.onSend : t.subtle} strokeWidth={2.8} />
                </PressableScale>
              </Appear>
            ) : hasText ? (
              <Appear key="send" from={{ scale: 0.3 }}>
                <PressableScale onPress={send} onLongPress={loadSendAsOptions && onSendAs ? () => void openSendAs() : undefined} delayLongPress={350} hitSlop={6} scaleTo={0.82} accessibilityRole="button" accessibilityLabel="Send" accessibilityHint={loadSendAsOptions ? "Hold to send as another account" : undefined} style={{ width: 33, height: 33, borderRadius: 17, backgroundColor: t.send, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="send" size={17} color={t.onSend} strokeWidth={2.8} />
                </PressableScale>
              </Appear>
            ) : recording === "locked" ? (
              <Appear key="locked-send" from={{ scale: 0.3 }}>
                <PressableScale onPress={() => void recorder.current?.finish(true)} hitSlop={6} scaleTo={0.82} accessibilityRole="button" accessibilityLabel="Send voice message" style={{ width: 33, height: 33, borderRadius: 17, backgroundColor: t.send, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="send" size={17} color={t.onSend} strokeWidth={2.8} />
                </PressableScale>
              </Appear>
            ) : textOnly ? (
              <View style={{ width: 33, height: 33, borderRadius: 17, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
                <Icon name="send" size={17} color={t.subtle} strokeWidth={2.8} />
              </View>
            ) : (
              <Appear key="mic" from={{ scale: 0.5 }}>
                {/* Hold to record. The same view keeps the touch for the whole hold, so it stays put while the text field swaps to the recorder. */}
                <View
                  {...mic.panHandlers}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Record a voice message"
                  accessibilityHint="Double tap to start recording"
                  accessibilityActions={[{ name: "activate" }]}
                  onAccessibilityAction={() => {
                    hold.current = { at: Date.now(), over: true };
                    setRecording("locked");
                  }}
                  style={{ width: 33, height: 33, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: recording ? ORANGE : "transparent", transform: [{ scale: recording ? 1.7 : 1 }] }}
                >
                  <Icon name="mic" size={21} color={recording ? "#FFFFFF" : t.subtle} strokeWidth={1.9} />
                </View>
              </Appear>
            )}
          </GlassSurface>
        </View>
      </View>

      {sendAsMenu ? <SendAsMenu options={sendAsMenu.options} checking={sendAsMenu.checking} onPick={(a) => void pickSendAs(a)} onClose={() => setSendAsMenu(null)} /> : null}

      <AttachSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPhotos={() => {
          setSheetOpen(false);
          // Same as Document below: iOS won't present the photo picker while the sheet's Modal is still dismissing.
          setTimeout(() => {
            void pickPhoto().catch(() => onError("Couldn't open your photos. Try again."));
          }, 350);
        }}
        onCamera={() => {
          setSheetOpen(false);
          void takePhoto();
        }}
        onDocument={() => {
          setSheetOpen(false);
          // iOS won't present the document picker while the sheet's Modal is still
          // dismissing (it silently does nothing), so wait out the 220 ms slide-out.
          setTimeout(() => {
            void pickFile().catch(() => onError("Couldn't open your files. Try again."));
          }, 350);
        }}
        onPoll={() => {
          setSheetOpen(false);
          onAttachPoll();
        }}
        onEvent={() => {
          setSheetOpen(false);
          onAttachEvent();
        }}
      />
    </View>
  );
});
