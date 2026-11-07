import { test, expect } from "@playwright/test";
import { webStoreLinks } from "../../lib/destinyOne/storeLinks";

// The /app page's pre-order buttons. A store shows a working button only once
// its link has been set on purpose; the app's own fallbacks (TestFlight, and
// the Play listing before it opens) would send a website visitor to an error.

const KEYS = ["D1_IOS_STORE_URL", "D1_ANDROID_STORE_URL"] as const;
const saved: Record<string, string | undefined> = {};

test.beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

test.afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

test("no links until they are configured", () => {
  expect(webStoreLinks()).toEqual({ ios: null, android: null });
});

test("configured https links are used as they are", () => {
  process.env.D1_IOS_STORE_URL = "https://apps.apple.com/app/id1234567890";
  process.env.D1_ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=uk.destinytees.one";
  expect(webStoreLinks()).toEqual({
    ios: "https://apps.apple.com/app/id1234567890",
    android: "https://play.google.com/store/apps/details?id=uk.destinytees.one",
  });
});

test("an app-only link such as TestFlight never reaches the website", () => {
  process.env.D1_IOS_STORE_URL = "itms-beta://";
  expect(webStoreLinks().ios).toBeNull();
});
