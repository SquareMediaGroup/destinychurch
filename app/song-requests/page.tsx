import type { Metadata } from "next";
import SongRequestsClient from "@/components/song-requests/SongRequestsClient";

export const metadata: Metadata = {
  title: "Song Requests",
  description: "Request a song at a Destiny Church event.",
  // An event tool, open only while an event is on: not something to index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SongRequestsPage() {
  return (
    <main className="song-bg relative min-h-screen overflow-hidden px-4 pb-24 pt-10 text-[#1a0b2e] sm:pt-14">
      <SongRequestsClient />
    </main>
  );
}
