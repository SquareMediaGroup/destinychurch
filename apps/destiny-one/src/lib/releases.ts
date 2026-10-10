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
    version: "0.12",
    features: [
      { icon: "archive", title: "Archive chats", body: "Swipe a chat or press and hold it, then Archive. It moves to Archived at the top of Chats and goes quiet, though @mentions still reach you. Only you see the change." },
      { icon: "sparkle", title: "DestinyAI, smarter and faster", body: "Answers appear as they're written, and you can see what it's doing while you wait. It can now play a sermon right in the chat." },
      { icon: "sliders", title: "Simpler Appearance controls", body: "Fade and Blur are now five easy steps from Low to High, so adjusting them no longer fights the swipe back." },
      { icon: "search", title: "Search, ready to type", body: "Tap the Search tab and the keyboard opens straight away." },
      { icon: "chats", title: "Smoother chat previews", body: "Pressing and holding a chat shows a cleaner preview, and peeking again and again no longer crashes the app." },
      { icon: "check", title: "Sharper reactions, and lots of fixes", body: "Emoji reactions stay crisp while they animate, sermon cards no longer leave the chat blank, and plenty of smaller fixes besides." },
    ],
  },
  {
    version: "0.10",
    features: [
      { icon: "sparkle", title: "Meet DestinyAI", body: "Smart Search, now in Destiny One. Find it at the top of Chats and ask about events, services, groups, sermons or giving." },
      { icon: "chats", title: "Ask it in any group", body: "Type @DestinyAI and your question. It answers in the chat, as a reply to you." },
      { icon: "reply", title: "Give it context", body: "Reply to a message, then tag @DestinyAI, and it reads that message too. It can't see anything else in your chats." },
      { icon: "calendar", title: "Knows what's on", body: "It reads the church calendar live, so it can tell you when things are and how to sign up." },
    ],
  },
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

