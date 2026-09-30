// The composer's "+" sheet: a grid of icon tiles sliding up from the bottom,
// replacing a plain OS action sheet so it matches the rest of the app.

import { useEffect, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
  // The native "slide" animation would drag the scrim down with the sheet, so
  // the Modal itself is not animated: the scrim fades and the sheet slides.
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  // Mount as soon as it's asked to show; unmount only once the close animation ends.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 280 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim, opacity: progress }]} />
      <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, transform: [{ translateY }] }}>
        <View style={[{ borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: t.sheet, paddingTop: 22, paddingBottom: insets.bottom + 22, paddingHorizontal: 16 }, t.shadow]}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 18 }}>
            <AttachOption t={t} icon="photo" label="Photos" onPress={onPhotos} />
            <AttachOption t={t} icon="camera" label="Camera" onPress={onCamera} />
            <AttachOption t={t} icon="doc" label="Document" onPress={onDocument} />
            <AttachOption t={t} icon="poll" label="Poll" onPress={onPoll} />
            <AttachOption t={t} icon="calendar" label="Event" onPress={onEvent} />
          </View>
        </View>
      </Animated.View>
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
