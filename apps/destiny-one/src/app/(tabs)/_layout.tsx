// Chats / Search / Profile, on the system tab bar (UITabBarController).
//
// On iOS 26 this is Apple's real Liquid Glass tab bar: it floats, shrinks as
// you scroll and follows Reduce Transparency / Reduce Motion by itself. Screens
// manage their own insets (automatic content insets are off) and pad the
// bottom to clear the bar.
//
// Double pressing the Profile tab hops to the most recently used other account.
// (The old long-press on Profile is gone: the system bar has no long-press
// hook. All accounts are still reachable from the Profile screen.)

import { useRef } from "react";
import { Image } from "react-native";
import { isDoublePress } from "@destiny/shared";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { confirmOwner, nextAccountSlot } from "@/lib/accounts";
import { haptic } from "@/lib/haptics";
import { useSession } from "@/state/session";
import { useTheme } from "@/theme/tokens";

export default function TabsLayout() {
  const t = useTheme();
  const { switchTo, accounts, me } = useSession();
  const lastProfilePress = useRef<number | null>(null);

  /** Double press on Profile: hop to the most recently used other account (Face ID only if it's been a while). */
  async function quickSwitch() {
    const slot = nextAccountSlot();
    const target = accounts.find((a) => a.slot === slot);
    if (!slot || !target) return;
    if (!(await confirmOwner(target.displayName, slot))) return;
    haptic.selection();
    await switchTo(slot, { announce: true });
  }

  // Your own picture as the Profile icon (a circle, with a tint ring when selected); the person symbol until one is set.
  const avatar = (ring: boolean) => (
    <Image source={{ uri: me?.avatarUrl ?? undefined }} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: ring ? 2 : 0, borderColor: t.tint }} />
  );

  return (
    <NativeTabs tintColor={t.tint}>
      <NativeTabs.Trigger name="chats" accessibilityLabel="Chats" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label hidden>Chats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="find" accessibilityLabel="Search" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label hidden>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="profile"
        accessibilityLabel="Profile"
        disableAutomaticContentInsets
        listeners={{
          tabPress: () => {
            const now = Date.now();
            if (isDoublePress(lastProfilePress.current, now)) {
              lastProfilePress.current = null;
              void quickSwitch();
              return;
            }
            lastProfilePress.current = now;
          },
        }}
      >
        <NativeTabs.Trigger.Label hidden>Profile</NativeTabs.Trigger.Label>
        {me?.avatarUrl ? (
          <NativeTabs.Trigger.Icon src={{ default: avatar(false), selected: avatar(true) }} renderingMode="original" />
        ) : (
          <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        )}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
