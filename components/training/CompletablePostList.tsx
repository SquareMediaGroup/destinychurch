"use client";

import { useState } from "react";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import { useCompletedSet } from "./useTrainingProgress";
import type { TrainingPost, TrainingFolder } from "@/lib/training";

type PostItem = Pick<TrainingPost, "id" | "slug" | "title" | "summary" | "folder_id">;

// Posts list with a per-post completion indicator, kept in sync with the
// hero progress bar via the shared completed set.
export default function CompletablePostList({
  posts,
  folders = [],
  basePath,
}: {
  posts: PostItem[];
  folders?: TrainingFolder[];
  basePath: string;
}) {
  const completed = useCompletedSet();
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const getPostsInFolder = (folderId: string | null) => {
    return posts.filter((p) => p.folder_id === folderId);
  };

  const renderPost = (post: PostItem) => {
    const done = completed.has(post.id);
    return (
      <AnimateIn key={post.id}>
        <Link
          href={`${basePath}/${post.slug}`}
          className="group flex items-start gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
        >
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              done
                ? "bg-destiny-green/10 text-destiny-green"
                : "bg-destiny-orange/10 text-destiny-orange"
            }`}
          >
            <span className="material-symbols-rounded text-[20px]">
              {done ? "check_circle" : "play_lesson"}
            </span>
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-destiny-grey transition group-hover:text-destiny-orange">
              {post.title}
            </h2>
            {post.summary && (
              <p className="mt-0.5 text-sm text-destiny-grey/55">
                {post.summary}
              </p>
            )}
            {done && (
              <span className="mt-1 inline-block text-[11px] font-bold uppercase tracking-wider text-destiny-green">
                Completed
              </span>
            )}
          </div>
          <span className="material-symbols-rounded mt-1 text-base text-destiny-grey/30 transition group-hover:translate-x-0.5 group-hover:text-destiny-orange">
            arrow_forward
          </span>
        </Link>
      </AnimateIn>
    );
  };

  const ungrouped = getPostsInFolder(null);

  if (activeFolderId !== null) {
    const activeFolder = folders.find((f) => f.id === activeFolderId);
    const folderPosts = getPostsInFolder(activeFolderId);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveFolderId(null)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-destiny-grey transition hover:bg-black/10"
          >
            <span className="material-symbols-rounded text-xl">arrow_back</span>
          </button>
          <h2 className="text-2xl font-black text-destiny-grey">
            {activeFolder?.name}
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {folderPosts.length === 0 ? (
            <p className="py-10 text-center text-destiny-grey/50">No posts in this folder.</p>
          ) : (
            folderPosts.map(renderPost)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {folders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {folders.map((folder) => {
            const count = getPostsInFolder(folder.id).length;
            // Calculate how many are completed in this folder
            const folderPosts = getPostsInFolder(folder.id);
            const completedCount = folderPosts.filter((p) => completed.has(p.id)).length;
            const isFullyCompleted = count > 0 && completedCount === count;

            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                className="group relative flex cursor-pointer flex-col gap-2 rounded-3xl border border-black/5 bg-white p-6 text-left shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`material-symbols-rounded text-4xl transition ${
                      isFullyCompleted
                        ? "text-destiny-green"
                        : "text-destiny-orange/80 group-hover:text-destiny-orange"
                    }`}
                  >
                    {isFullyCompleted ? "check_circle" : "folder"}
                  </span>
                </div>
                <div className="mt-2 w-full">
                  <h3 className="font-bold text-destiny-grey">{folder.name}</h3>
                  <p className="text-sm font-medium text-destiny-grey/50">
                    {completedCount} / {count} completed
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full bg-destiny-green transition-all duration-500 ease-out"
                      style={{ width: `${count === 0 ? 0 : (completedCount / count) * 100}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {ungrouped.length > 0 && (
        <div>
          {folders.length > 0 && (
            <h3 className="mb-4 text-xl font-black text-destiny-grey">
              Ungrouped Posts
            </h3>
          )}
          <div className="flex flex-col gap-3">
            {ungrouped.map(renderPost)}
          </div>
        </div>
      )}
    </div>
  );
}
