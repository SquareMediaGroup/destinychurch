// The message composer: attach (image or PDF, 20 MB) from files or the photo
// library, take a photo with the camera (every image is re-encoded first so no
// location or other hidden details leave the phone: src/lib/cleanImage.ts), a
// glass text field that lights up with the beam while focused, the reply bar,
// and the send button that swaps in for the attach shortcut once there's text.

import { forwardRef, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES, MAX_MESSAGE_LENGTH } from "@destiny/shared";
import { GlassSurface } from "@/components/GlassSurface";
import { Icon } from "@/components/Icon";
import { Beam } from "@/components/ui";
import { cleanImage } from "@/lib/cleanImage";
import { INK, ORANGE, useTheme } from "@/theme/tokens";

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
  onError: (message: string) => void;
}

export const Composer = forwardRef<TextInput, Props>(function Composer({ replying, onCancelReply, onSend, onAttach, onError }, ref) {
  const t = useTheme();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
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

  function pick() {
    Alert.alert("Add to message", undefined, [
      { text: "Take Photo", onPress: () => void takePhoto() },
      { text: "Choose Photo", onPress: () => void pickPhoto() },
      { text: "Choose File", onPress: () => void pickFile() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
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
        <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Attach a photo or PDF">
          {({ pressed }) => (
            <GlassSurface interactive style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 }, t.shadow]}>
              <Icon name="plus" size={22} color={t.text} />
            </GlassSurface>
          )}
        </Pressable>

        <Beam radius={23} active={focused} dim="rgba(245,128,33,0.25)" style={{ flex: 1 }}>
          <GlassSurface style={{ minHeight: 41, borderRadius: 21.5, flexDirection: "row", alignItems: "flex-end", gap: 6, paddingLeft: 16, paddingRight: 4, paddingVertical: 4 }}>
            <TextInput
              ref={ref}
              value={draft}
              onChangeText={(v) => setDraft(v.slice(0, MAX_MESSAGE_LENGTH))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Message"
              placeholderTextColor="#6B7580"
              selectionColor={ORANGE}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              accessibilityLabel="Message"
              style={{ flex: 1, minHeight: 33, maxHeight: 120, fontSize: 17, color: t.text, paddingTop: 7, paddingBottom: 7 }}
            />
            {hasText ? (
              <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send" style={({ pressed }) => ({ width: 33, height: 33, borderRadius: 17, backgroundColor: ORANGE, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}>
                <Icon name="send" size={17} color={INK} strokeWidth={2.8} />
              </Pressable>
            ) : (
              <Pressable onPress={() => void takePhoto()} accessibilityRole="button" accessibilityLabel="Take a photo" style={{ width: 33, height: 33, alignItems: "center", justifyContent: "center" }}>
                <Icon name="camera" size={21} color={t.subtle} strokeWidth={1.9} />
              </Pressable>
            )}
          </GlassSurface>
        </Beam>
      </View>
    </View>
  );
});
