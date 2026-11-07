// Layout insets that hold up on every iPhone shape, including iPhone Duo.
//
// On iPhone Duo (Apple HIG, "Designing for iPhone Duo") the system moves the
// status bar, Dynamic Island and tab bar to the SIDE of the display in some
// poses: always on the closed (outer) display, and on the open (inner) display
// in landscape. Two things follow for us:
//
//   1. Left/right safe-area insets are no longer always 0, so every screen has
//      to respect them (useSideInsets, and the root stack's content padding in
//      app/_layout.tsx). On every other iPhone in portrait they ARE 0, so this
//      changes nothing there.
//   2. The tab bar isn't always at the bottom. Tab screens used to pad a fixed
//      ~110pt at the bottom to clear it. withTabBarInsets gives a tab screen
//      its own safe-area provider, which measures the screen's real UIKit safe
//      area, so insets include the tab bar on whichever edge it sits.
//      useTabBarClearance then picks the bottom padding: the old fixed value
//      while the bar is along the bottom (so nothing moves on today's phones),
//      and just the home-indicator inset when the bar has moved to the side.

import { createContext, useContext, type ComponentType } from "react";
import { SafeAreaProvider, useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";

/** Left/right padding that keeps content clear of the side status bar, camera and bars. */
export function useSideInsets(): { paddingLeft: number; paddingRight: number } {
  const insets = useSafeAreaInsets();
  return { paddingLeft: insets.left, paddingRight: insets.right };
}

// The window's insets, seen from outside a tab screen's own provider. Comparing
// them with the screen's insets tells us whether the tab bar is on a side.
const WindowInsets = createContext<EdgeInsets | null>(null);

/**
 * Wraps a tab screen so useSafeAreaInsets() inside it includes the system tab
 * bar, wherever the system put it.
 */
export function withTabBarInsets<P extends object>(Screen: ComponentType<P>): ComponentType<P> {
  function TabScreen(props: P) {
    const windowInsets = useSafeAreaInsets();
    return (
      <WindowInsets.Provider value={windowInsets}>
        <SafeAreaProvider>
          <Screen {...props} />
        </SafeAreaProvider>
      </WindowInsets.Provider>
    );
  }
  TabScreen.displayName = `withTabBarInsets(${Screen.displayName ?? Screen.name ?? "Screen"})`;
  return TabScreen;
}

/** True when the system has put the tab bar along the left or right edge (iPhone Duo). */
export function useTabBarOnSide(): boolean {
  const insets = useSafeAreaInsets();
  const windowInsets = useContext(WindowInsets);
  if (!windowInsets) return false;
  return insets.left > windowInsets.left + 1 || insets.right > windowInsets.right + 1;
}

/**
 * Bottom padding for a tab screen's scrolling content. `bottomBar` is the
 * padding that clears a bottom tab bar (what the screen used before).
 */
export function useTabBarClearance(bottomBar: number): number {
  const insets = useSafeAreaInsets();
  const onSide = useTabBarOnSide();
  return onSide ? insets.bottom + 24 : Math.max(bottomBar, insets.bottom + 27);
}
