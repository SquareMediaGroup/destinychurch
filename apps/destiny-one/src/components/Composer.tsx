// The message composer: attach (image or PDF, 20 MB) from files or the photo
// library, take a photo with the camera (every image is re-encoded first so no
// location or other hidden details leave the phone: src/lib/cleanImage.ts), a
// glass text field, the reply bar,
// and the send button that swaps in for the attach shortcut once there's text.

import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES, MAX_MESSAGE_LENGTH } from "@destiny/shared";
import { AttachSheet } from "@/components/AttachSheet";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { SendAsMenu } from "@/components/SendAsMenu";
import type { Account } from "@/lib/accounts";
import { cleanImage } from "@/lib/cleanImage";
import { haptic } from "@/lib/haptics";
import { ORANGE, useTheme } from "@/theme/tokens";

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

interface Props {
  replying: { name: string; text: string } | null;
  onCancelReply: () => void;
  onSend: (text: string) => void;
  onAttach: (file: PickedFile) => void;
  onAttachPoll: () => void;
  onAttachEvent: () => void;
  onError: (message: string) => void;
  /** Holding Send: which other signed-in accounts could send this instead. Omit to turn the hold off. */
  loadSendAsOptions?: () => Promise<Account[]>;
  /** The chosen account sends `text`. Resolves once sent, or throws. */
  onSendAs?: (account: Account, text: string) => Promise<void>;
}

export const Composer = forwardRef<TextInput, Props>(function Composer({ replying, onCancelReply, onSend, onAttach, onAttachPoll, onAttachEvent, onError, loadSendAsOptions, onSendAs }, ref) {
  const t = useTheme();
  const [draft, setDraft] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sendAsMenu, setSendAsMenu] = useState<{ text: string; options: Account[]; checking: boolean } | null>(null);
  const hasText = draft.trim().length > 0;

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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      onError("Allow photo library access to send a photo.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    await imagePickerAsset(res.assets[0], "Photo.jpg");
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      onError("Allow camera access to take a photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (res.canceled || !res.assets[0]) return;
    await imagePickerAsset(res.assets[0], "Photo.jpg");
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
    if (!text) return;
    haptic.sent();
    onSend(text);
    setDraft("");
  }

  return (
    <View style={{ gap: 8 }}>
      {replying ? (
        <GlassSurface style={{ marginLeft: 52, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 18 }}>
          <Icon name="reply" size={16} color={t.tint} strokeWidth={2.2} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.tint }}>Replying to {replying.name}</Text>
            <Text numberOfLines={1} style={{ fontSize: 14, color: t.muted }}>
              {replying.text}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} accessibilityLabel="Cancel reply" style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
            <Icon name="close" size={12} color={t.muted} strokeWidth={3} />
          </Pressable>
        </GlassSurface>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Pressable
          onPress={() => {
            haptic.selection();
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Add to message"
        >
          {({ pressed }) => (
            <GlassSurface interactive style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }, t.shadow]}>
              <Icon name="plus" size={22} color={t.text} />
            </GlassSurface>
          )}
        </Pressable>

        <View style={{ flex: 1 }}>
          <GlassSurface style={{ minHeight: 41, borderRadius: 21.5, flexDirection: "row", alignItems: "flex-end", gap: 6, paddingLeft: 16, paddingRight: 4, paddingVertical: 4 }}>
            <TextInput
              ref={ref}
              value={draft}
              onChangeText={(v) => setDraft(v.slice(0, MAX_MESSAGE_LENGTH))}
              placeholder="Message"
              placeholderTextColor={t.subtle}
              selectionColor={ORANGE}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              accessibilityLabel="Message"
              maxFontSizeMultiplier={1.6}
              style={{ flex: 1, minHeight: 33, maxHeight: 140, fontSize: 17, color: t.text, paddingTop: 7, paddingBottom: 7 }}
            />
            {hasText ? (
              <Pressable onPress={send} onLongPress={loadSendAsOptions && onSendAs ? () => void openSendAs() : undefined} delayLongPress={350} hitSlop={6} accessibilityRole="button" accessibilityLabel="Send" accessibilityHint={loadSendAsOptions ? "Hold to send as another account" : undefined} style={({ pressed }) => ({ width: 33, height: 33, borderRadius: 17, backgroundColor: t.send, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}>
                <Icon name="send" size={17} color={t.onSend} strokeWidth={2.8} />
              </Pressable>
            ) : (
              <Pressable onPress={() => void takePhoto()} accessibilityRole="button" accessibilityLabel="Take a photo" style={{ width: 33, height: 33, alignItems: "center", justifyContent: "center" }}>
                <Icon name="camera" size={21} color={t.subtle} strokeWidth={1.9} />
              </Pressable>
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
          void pickPhoto();
        }}
        onCamera={() => {
          setSheetOpen(false);
          void takePhoto();
        }}
        onDocument={() => {
          setSheetOpen(false);
          void pickFile();
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
