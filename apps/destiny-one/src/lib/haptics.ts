// Haptic feedback, used sparingly for moments that mean something: a choice
// snapping into place, a message leaving, a gesture reaching its threshold.
// Follows Apple's guidance: causal (fires on the action itself), and never on
// every scroll or tap. Anywhere it isn't supported (web, some emulators) the
// call quietly does nothing.

import * as Haptics from "expo-haptics";

function safe(run: () => Promise<void>) {
  run().catch(() => undefined);
}

export const haptic = {
  /** A choice changing: tab, filter, colour, wallpaper, poll vote. */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** A light physical tap: a gesture reaching its threshold. */
  tick: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A firmer tap: a long press opening a menu. */
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A message sent. */
  sent: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
