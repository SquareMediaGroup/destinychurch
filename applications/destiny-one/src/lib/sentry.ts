// Crash and error reporting (Sentry, EU region). Off unless EXPO_PUBLIC_SENTRY_DSN
// is set at build time, so local and test builds report nothing by default.
//
// Many members are young people, so it sends as little as possible: the
// member's internal id and nothing else about them (no name, email or IP), no
// screenshots or screen recordings, no console output, no tap details (a tap
// on a message would carry its text), and web addresses without their query
// strings. What's left is the error, where in the code it happened, the
// device and app version, and the screens and requests leading up to it.

import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import type { ComponentType } from "react";
import { config } from "@/lib/config";

const enabled = !!config.sentryDsn;

/** Breadcrumb categories that can't carry chat text or personal details. */
const KEEP = new Set(["fetch", "xhr", "http", "navigation", "app.lifecycle"]);

function stripQuery(url: unknown): unknown {
  return typeof url === "string" ? url.split("?")[0] : url;
}

if (enabled) {
  Sentry.init({
    dsn: config.sentryDsn!,
    environment: __DEV__ ? "development" : "production",
    release: Constants.expoConfig?.version,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableUserInteractionTracing: false,
    enableCaptureFailedRequests: false,
    // Errors only: no performance tracing or profiling.
    tracesSampleRate: 0,
    beforeBreadcrumb(crumb) {
      if (!crumb.category || !KEEP.has(crumb.category)) return null;
      if (crumb.data) {
        crumb.data = { ...crumb.data, url: stripQuery(crumb.data.url) };
        // Route params can hold message text (the Report screen gets it this way).
        delete crumb.data.params;
      }
      return crumb;
    },
    beforeSend(event) {
      if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
      if (event.request) event.request = { url: stripQuery(event.request.url) as string | undefined };
      return event;
    },
  });
}

/** Tags reports with the signed-in member's internal id (never their name or email). */
export function setReportingMember(memberId: string | null) {
  if (enabled) Sentry.setUser(memberId ? { id: memberId } : null);
}

/** The last error sent, so "Report a problem" can point staff at it. */
export function lastErrorId(): string | null {
  return enabled ? (Sentry.lastEventId() ?? null) : null;
}

/** Wraps the root component so render crashes are caught and reported. */
export function withErrorReporting(Root: ComponentType<Record<string, unknown>>) {
  return enabled ? Sentry.wrap(Root) : Root;
}
