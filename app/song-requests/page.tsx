import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import SongRequestsClient from "@/components/song-requests/SongRequestsClient";

export const metadata: Metadata = {
  title: "Song Requests",
  description: "Request a song at a Destiny Church event.",
  alternates: { canonical: "/song-requests" },
  // An event tool, open only while an event is on: not something to index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function SongRequestsPage() {
  return (
    <main className="min-h-screen bg-[#0f0f0f] pb-24 pt-28 text-white">
      <Container width="content">
        <SongRequestsClient />
      </Container>
    </main>
  );
}
