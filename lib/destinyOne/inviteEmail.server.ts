// Destiny One — the invite email.
//
// Deliberately minimal: the invitee's own name and nothing else about anyone.
// No inviter name, no community names (a group like "Youth" tells a stranger
// who opened the email something about a child). The app does the rest once
// they sign in with this address.

import "server-only";
import { sendEmailCard } from "@/lib/emailCard";

/** Store links once the app is published. Until then the email says "coming soon". */
const IOS_URL = process.env.D1_APP_STORE_URL || null;
const ANDROID_URL = process.env.D1_PLAY_STORE_URL || null;

export async function sendInviteEmail(to: string, name: string): Promise<void> {
  const rows: [string, string][] = [["Sign in with", to]];
  if (IOS_URL) rows.push(["iPhone", IOS_URL]);
  if (ANDROID_URL) rows.push(["Android", ANDROID_URL]);

  await sendEmailCard({
    to,
    subject: "You're invited to Destiny One",
    badge: "Destiny One",
    heading: `Hi ${name.split(" ")[0]}, you're invited`,
    intro:
      "You've been invited to Destiny One, the Destiny Church app for our teams and groups. " +
      "Download the app and sign in with this email address — you'll be sent a code, and you're in. " +
      (IOS_URL || ANDROID_URL ? "" : "The app is coming to the App Store and Google Play soon."),
    rows,
    ...(IOS_URL ? { ctaHref: IOS_URL, ctaLabel: "Get the app" } : {}),
  });
}
