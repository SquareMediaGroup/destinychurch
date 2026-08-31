import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApprovedPhotos, getBoardBySlug } from "@/lib/media.server";
import BoardDetail from "@/components/media/BoardDetail";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const revalidate = 60;

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

  const photos = await getApprovedPhotos(board.id);

  return (
    <>
      <BoardDetail board={board} photos={photos} />
      <WorshipWithUsSection />
    </>
  );
}
