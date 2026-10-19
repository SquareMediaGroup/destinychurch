// Whether the on-screen keyboard is up. Screens use it to drop the
// home-indicator padding under a bottom bar while the keyboard covers that
// edge anyway, so the bar sits snug on the keyboard.

import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // iOS sends "will" events, so the padding changes in step with the keyboard animation.
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setShown(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}
