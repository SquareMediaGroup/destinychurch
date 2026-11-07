// Forced update + maintenance switch (spec E5).
//
// Staff set a minimum build per platform, and an optional maintenance message,
// at /admin/destiny-one/settings. The app reads them from the public
// GET /config (no token) on launch and on every return to the foreground.
//
// The answer is saved with the rest of the cache, so an offline launch uses
// the last one it saw and is never blocked just for being offline. A build
// with no native build number (Expo Go, web) is always allowed.
//
// To see either screen in Expo Go, set EXPO_PUBLIC_D1_PREVIEW_GATE=update (or
// maintenance) in .env.local and restart Expo with -c. Development builds only:
// a release build ignores it.

import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Application from "expo-application";
import { useQuery } from "@tanstack/react-query";
import { appGate, type D1AppConfig, type D1AppGate } from "@destiny/shared";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { queryClient } from "@/lib/queryClient";

function nativeBuild(): number | null {
  const raw = Application.nativeBuildVersion;
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export const BUILD = nativeBuild();

const PREVIEW = __DEV__ ? process.env.EXPO_PUBLIC_D1_PREVIEW_GATE : undefined;
const PREVIEW_GATE: D1AppGate | null = PREVIEW === "update" || PREVIEW === "maintenance" ? PREVIEW : null;

export function useAppGate(): { gate: D1AppGate; config: D1AppConfig | undefined } {
  const { data } = useQuery({ queryKey: keys.appConfig, queryFn: () => api.appConfig() });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void queryClient.invalidateQueries({ queryKey: keys.appConfig });
    });
    return () => sub.remove();
  }, []);

  if (PREVIEW_GATE) return { gate: PREVIEW_GATE, config: data };
  return { gate: appGate(data, Platform.OS, BUILD), config: data };
}
