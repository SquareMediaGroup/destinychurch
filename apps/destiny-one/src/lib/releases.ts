// What shipped in each release, latest first. Also decides whether the app
// shows the release splash (see releaseSplash.ts).
//
// Policy: every X.X release gets a splash. An X.X.X patch gets none, unless it
// is a really good bug fix: add an entry for it with `splash: true`. A patch
// with no entry never shows anything. Bump app.json's version and add the
// entry at the top when you ship.

import type { IconName } from "@/components/Icon";

export interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

export interface Release {
  /** "0.9" for a release, "0.9.1" for a patch worth announcing. */
  version: string;
  /** Required on a patch entry (X.X.X); a release (X.X) always shows. */
  splash?: boolean;
  features: Feature[];
}

export const RELEASES: Release[] = [
  {
    version: "0.9",
    features: [
      { icon: "camera", title: "A camera built into Destiny One", body: "Take a photo without leaving the chat. Tap the + button, then Camera." },
      { icon: "mic", title: "Voice messages, WhatsApp style", body: "Hold the microphone to record and let go to send. Slide left to cancel, or up to lock it and keep your hands free." },
      { icon: "photo", title: "Photos, files and voice notes that just work", body: "Fixes for the photo and file pickers not opening from the + sheet, and for voice messages that wouldn't send." },
      { icon: "person", title: "Profile photo in light and dark", body: "Your picture no longer disappears from the tab bar when you switch between light and dark." },
    ],
  },
  {
    version: "0.8",
    features: [
      { icon: "pencil", title: "Edit messages", body: "Fix a typo for 15 minutes after sending. Press and hold your message, then Edit." },
      { icon: "people", title: "@mentions", body: "Type @ to mention someone. They'll hear about it even if they've muted the group." },
      { icon: "pin", title: "Pinned messages", body: "Group admins can pin up to 3 messages to the top of a chat." },
      { icon: "check", title: "Seen by", body: "See who has read your messages. You can turn read receipts off in Profile." },
      { icon: "photo", title: "Photos, full screen", body: "Pinch to zoom, swipe between photos, and save them to your library." },
      { icon: "doc", title: "Photos and files", body: "Everything shared in a chat, in Group info." },
      { icon: "mic", title: "Voice messages", body: "Tap the microphone to record up to 5 minutes." },
      { icon: "forward", title: "Forward", body: "Send a message on to another chat you're in." },
      { icon: "share", title: "Share into Destiny One", body: "Share photos, PDFs and links from other apps straight into a chat." },
      { icon: "bell", title: "Reply from notifications", body: "Reply or mark as read without opening the app." },
      { icon: "calendar", title: "Upcoming events", body: "See what's on in Search, and share an event to a chat." },
      { icon: "chats", title: "Typing and link previews", body: "See when someone's typing, and a preview of links people share." },
      { icon: "help", title: "Help, and a tidier Profile", body: "Answers to common questions, and Profile grouped into sections." },
    ],
  },
];

