// The app's side of the Bible connection. The words always come through our
// API (api.passage), never from YouVersion directly, so no member data goes to
// them. This file only fetches and caches through TanStack Query, and opens a
// passage in the Bible App.

import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import type { D1Passage } from "@destiny/shared";
import { api } from "@/lib/api";

/** A passage's words (with its version and copyright line). Cached for an hour on the phone. */
export function usePassage(passageId: string | null | undefined, bibleId?: number) {
  return useQuery<D1Passage>({
    queryKey: ["passage", bibleId || "default", passageId],
    // 0 (or none) asks for the church's default version.
    queryFn: () => api.passage(passageId!, bibleId || undefined),
    enabled: !!passageId,
    staleTime: 3_600_000,
    gcTime: 6 * 3_600_000,
    retry: 1,
  });
}

/** Where a passage is on bible.com, even when we couldn't fetch its version's abbreviation. */
export function passageUrl(passageId: string, bibleId: number, webUrl?: string | null): string {
  return webUrl || `https://www.bible.com/bible/${bibleId || 113}/${passageId}`;
}

/**
 * Opens the passage in the YouVersion Bible App when it's installed: bible.com
 * links are universal links the app claims. Without the app, the system opens
 * them in the browser; if even that fails, the in-app browser.
 */
export async function openInBibleApp(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    await WebBrowser.openBrowserAsync(url).catch(() => undefined);
  }
}
