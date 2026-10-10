// The video part of a sermon card. Plays the sermon right in the chat with
// YouTube's player (react-native-webview) when this build has it. A build made
// before the web view was added doesn't have the native module, and rendering
// it there throws: so check for the module first, and keep any failure inside
// this card (an error boundary) instead of taking the chat down with it. In
// either case the card falls back to the thumbnail, which opens the sermon in
// the in-app browser.
//
// The player always gets a fixed width and height. With only an aspect ratio,
// YouTube's page filled whatever height it was given and reported a taller
// size back, so the row grew without end (tens of thousands of points) and the
// chat turned into blank space.

import { Component, type ComponentType, type ReactNode } from "react";
import { Image, Pressable, TurboModuleRegistry, View, useWindowDimensions } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Icon } from "@/components/Icon";

type WebViewComponent = ComponentType<{
  source: { uri: string; headers?: Record<string, string> };
  allowsInlineMediaPlayback?: boolean;
  allowsFullscreenVideo?: boolean;
  scrollEnabled?: boolean;
  automaticallyAdjustContentInsets?: boolean;
  style?: object;
  accessibilityLabel?: string;
}>;

/** The web view, or null when this build doesn't have its native module. */
function loadWebView(): WebViewComponent | null {
  try {
    // get(), not getEnforcing(): it returns null instead of throwing when the module is missing.
    // Loaded lazily so a build without the module never evaluates react-native-webview at all.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return TurboModuleRegistry.get("RNCWebViewModule") ? (require("react-native-webview").WebView as WebViewComponent) : null;
  } catch {
    return null;
  }
}

/** Decided once, when this file loads. */
const WebView = loadWebView();

const watchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

/** Catches a player that fails to render, and shows the thumbnail instead. */
class PlayerBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Sermon player failed, showing the thumbnail instead:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** The thumbnail with a play button. Opens the sermon in the in-app browser. */
function Thumbnail({ videoId, title, thumbnailUrl }: { videoId: string; title: string; thumbnailUrl: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Play sermon: ${title}`}
      onPress={() => void WebBrowser.openBrowserAsync(watchUrl(videoId))}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Image source={{ uri: thumbnailUrl }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
        <Icon name="play" size={26} color="#FFFFFF" strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

/**
 * How wide a sermon card is: what an incoming bubble has room for (the screen,
 * less the avatar, its gaps and the bubble's padding), up to 320.
 */
export function useSermonCardWidth(): number {
  const { width } = useWindowDimensions();
  return Math.max(200, Math.min(320, Math.round(width - 130)));
}

export function SermonPlayer({ videoId, title, thumbnailUrl, width }: { videoId: string; title: string; thumbnailUrl: string; width: number }) {
  const height = Math.round((width * 9) / 16);
  const thumbnail = <Thumbnail videoId={videoId} title={title} thumbnailUrl={thumbnailUrl} />;
  return (
    <View style={{ width, height, backgroundColor: "#000", overflow: "hidden" }}>
      {WebView ? (
        <PlayerBoundary fallback={thumbnail}>
          <WebView
            source={{ uri: `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`, headers: { Referer: "https://destinytees.uk" } }}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            scrollEnabled={false}
            automaticallyAdjustContentInsets={false}
            style={{ width, height, backgroundColor: "#000" }}
            accessibilityLabel={`Sermon: ${title}`}
          />
        </PlayerBoundary>
      ) : (
        thumbnail
      )}
    </View>
  );
}

export { watchUrl as sermonWatchUrl };
