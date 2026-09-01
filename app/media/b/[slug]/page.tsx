import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApprovedPhotos, getBoardBySlug } from "@/lib/media.server";
import { isBoardUnlocked } from "@/lib/mediaAccess";
import BoardDetail from "@/components/media/BoardDetail";
import BoardPasswordGate from "@/components/media/BoardPasswordGate";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

// Reading the unlock cookie (for password-protected boards) makes this route
// dynamic regardless of revalidate — Next can't know ahead of time whether a
// given board has a password, so it renders per-request for all of them.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  if (!board) return {};
  return {
    title: board.title,
    description: board.description ?? `Photos from ${board.title}.`,
    alternates: { canonical: `/media/b/${board.slug}` },
  };
}

export default async function MediaBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = await getBoardBySlug(slug);
  if (!board) notFound();

  if (board.hasPassword && !(await isBoardUnlocked(board.id))) {
    return <BoardPasswordGate boardId={board.id} boardTitle={board.title} />;
  }

  const photos = await getApprovedPhotos(board.id);

  return (
    <>
      <BoardDetail board={board} photos={photos} />
      <WorshipWithUsSection />
    </>
  );
}
