import type { Metadata } from "next";
import TalentVoteClient from "@/components/talent-show/TalentVoteClient";

export const metadata: Metadata = {
  title: "Talent Show Vote",
  description: "Vote for your favourite act at the Destiny Church talent show.",
  // An event tool, reached by QR code on the night: not something to index.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function TalentShowVotePage() {
  return (
    <main className="min-h-screen bg-destiny-grey-900 px-4 pb-20 pt-10 sm:pt-14">
      <TalentVoteClient />
    </main>
  );
}
