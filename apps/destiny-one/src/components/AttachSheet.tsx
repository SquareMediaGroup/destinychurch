// The composer's "+" sheet: a grid of icon tiles sliding up from the bottom,
// replacing a plain OS action sheet so it matches the rest of the app.

import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icon";
import { useTheme, type Theme } from "@/theme/tokens";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPhotos: () => void;
  onCamera: () => void;
  onDocument: () => void;
  onPoll: () => void;
  onEvent: () => void;
}

export function AttachSheet({ visible, onClose, onPhotos, onCamera, onDocument, onPoll, onEvent }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <View style={[{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: t.sheet, paddingTop: 22, paddingBottom: insets.bottom + 22, paddingHorizontal: 16 }, t.shadow]}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 18 }}>
            <AttachOption t={t} icon="photo" label="Photos" onPress={onPhotos} />
            <AttachOption t={t} icon="camera" label="Camera" onPress={onCamera} />
            <AttachOption t={t} icon="doc" label="Document" onPress={onDocument} />
            <AttachOption t={t} icon="poll" label="Poll" onPress={onPoll} />
            <AttachOption t={t} icon="calendar" label="Event" onPress={onEvent} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AttachOption({ t, icon, label, onPress }: { t: Theme; icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{ width: "20%", alignItems: "center", gap: 8, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.fill, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={24} color={t.text} strokeWidth={1.9} />
      </View>
      <Text style={{ fontSize: 12, color: t.muted }}>{label}</Text>
    </Pressable>
  );
}
