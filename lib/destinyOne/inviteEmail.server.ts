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

/**
 * `needsApproval`: a leader's invite — they sign in, then the church office
 * confirms them before they're in.
 */
export async function sendInviteEmail(to: string, name: string, opts: { needsApproval?: boolean } = {}): Promise<void> {
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
      (opts.needsApproval
        ? "Download the app and sign in with this email address — you'll be sent a code. The church office will then confirm your place, usually within a day or two. "
        : "Download the app and sign in with this email address — you'll be sent a code, and you're in. ") +
      (IOS_URL || ANDROID_URL ? "" : "The app is coming to the App Store and Google Play soon."),
    rows,
    ...(IOS_URL ? { ctaHref: IOS_URL, ctaLabel: "Get the app" } : {}),
  });
}
