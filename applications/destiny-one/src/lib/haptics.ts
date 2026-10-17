// Haptic feedback for moments that mean something: a choice snapping into
// place, a primary action, a message leaving or arriving, a gesture reaching
// its threshold, a warning before something destructive. Follows Apple's
// guidance: causal (fires on the action itself, never on a timer) and never on
// scrolling. Anywhere it isn't supported (web, some emulators) the call
// quietly does nothing.

import * as Haptics from "expo-haptics";

function safe(run: () => Promise<void>) {
  run().catch(() => undefined);
}

export const haptic = {
  /** A choice changing: tab, filter, colour, wallpaper, poll vote, a code digit. */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** A light physical tap: a gesture reaching its threshold, a primary button, a message arriving. */
  tick: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A firmer tap: a long press opening a menu. */
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A message sent. */
  sent: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A confirm dialog for something that can't be undone. */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptic;
