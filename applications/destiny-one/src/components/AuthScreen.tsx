// Frame for the sign-in and onboarding screens: safe-area padding, keyboard
// avoidance, optional back button, and a footer pinned to the bottom.

import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/ui";
import { useTheme } from "@/theme/tokens";

export function AuthScreen({ children, footer, back, grouped }: { children: ReactNode; footer?: ReactNode; back?: boolean; grouped?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: grouped ? t.grouped : t.bg }}>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: 20 }}>
        {back ? (
          <View style={{ height: 52, justifyContent: "center" }}>
            <BackButton />
          </View>
        ) : null}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingTop: 16, gap: 8 }}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
