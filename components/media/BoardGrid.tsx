import AnimateIn from "@/components/AnimateIn";
import BoardCard from "@/components/media/BoardCard";
import type { MediaBoardSummary } from "@/lib/media.server";

export default function BoardGrid({ boards }: { boards: MediaBoardSummary[] }) {
  if (boards.length === 0) {
    return (
      <section className="bg-white pb-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <p className="text-sm text-destiny-grey/50">
            No boards yet — check back soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white pb-20">
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <AnimateIn>
          <div className="grid grid-cols-2 gap-2.5 @xl:grid-cols-3">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
