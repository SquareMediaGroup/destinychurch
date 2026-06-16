"use client";

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

  return (
    <div className="flex flex-col gap-10">
      {ungrouped.length > 0 && (
        <div>
          {folders.length > 0 && (
            <h3 className="mb-4 text-xl font-black text-destiny-grey">
              Ungrouped
            </h3>
          )}
          <div className="flex flex-col gap-3">
            {ungrouped.map(renderPost)}
          </div>
        </div>
      )}
      
      {folders.map((folder) => {
        const folderPosts = getPostsInFolder(folder.id);
        if (folderPosts.length === 0) return null;
        
        return (
          <div key={folder.id}>
            <h3 className="mb-4 text-xl font-black text-destiny-grey">
              {folder.name}
            </h3>
            <div className="flex flex-col gap-3">
              {folderPosts.map(renderPost)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
