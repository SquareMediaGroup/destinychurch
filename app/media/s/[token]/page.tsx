import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApprovedPhotos, getBoardByToken } from "@/lib/media.server";
import BoardDetail from "@/components/media/BoardDetail";

// Unlisted boards must never be indexed — the share link is the only access
// control they have, and a search-engine listing would defeat that.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedMediaBoardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const board = await getBoardByToken(token);
  // Same 404 whether the token is wrong or the board is gone — never leak
  // which, so a guess can't learn anything from the response.
  if (!board) notFound();

  const photos = await getApprovedPhotos(board.id);

  return <BoardDetail board={board} photos={photos} />;
}
