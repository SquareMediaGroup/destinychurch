import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";
import {
  getTicketByToken,
  requesterView,
  type TicketRow,
} from "@/lib/designTickets.server";
import TicketTracker from "./TicketTracker";

// A link-shareable page about a real person's request. Keeping it out of search
// results is the difference between "only people with the link" and "anyone who
// searches the church's name and a filename".
export const metadata: Metadata = {
  title: "Your design request",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DesignRequestTrackerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  // One response for a wrong token, a deleted ticket and a malformed one — a
  // 404 that varies would tell someone probing which of their guesses was close.
  const ticket = await getTicketByToken(supabase, token);
  if (!ticket) notFound();

  const view = await requesterView(supabase, ticket as TicketRow);

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <TicketTracker token={token} initial={view} />
      </div>
    </div>
  );
}
