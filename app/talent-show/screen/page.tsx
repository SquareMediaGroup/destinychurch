import type { Metadata } from "next";
import TalentScreenClient from "@/components/talent-show/TalentScreenClient";

export const metadata: Metadata = {
  title: "Talent Show Results",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function TalentShowScreenPage() {
  return (
    <main className="min-h-screen bg-destiny-grey-900">
      <TalentScreenClient />
    </main>
  );
}
