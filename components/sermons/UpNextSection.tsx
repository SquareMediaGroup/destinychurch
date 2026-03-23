"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

type SortOption = "newest" | "oldest";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

interface UpNextSectionProps {
  videos: Video[];
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function UpNextSection({ videos }: UpNextSectionProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState("");

  const processed = useMemo(() => {
    let result = [...videos];

    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      result = result.filter((v) => v.title.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [videos, sort, filter]);

  return (
    <section>
      {/* Header with controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-white">Up Next</h2>
        <div className="flex items-center gap-3">
          {/* Filter input */}
          <div className="relative">
            <span className="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-white/30">
              filter_list
            </span>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              className="rounded-lg border border-white/10 bg-[#1e1e1e] py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-1 focus:ring-destiny-orange/20"
            />
          </div>
          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white focus:border-destiny-orange/50 focus:outline-none focus:ring-1 focus:ring-destiny-orange/20"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Horizontal scrollable row */}
      {processed.length > 0 ? (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
          {processed.map((rec) => (
            <Link
              key={rec.id}
              href={`/sermons/${rec.id}`}
              className="group w-[260px] flex-shrink-0 rounded-xl p-2 transition hover:bg-[#272727]"
            >
              <div
                className="relative overflow-hidden rounded-xl"
                style={{ aspectRatio: "16/9" }}
              >
                <Image
                  src={rec.thumbnail}
                  alt={rec.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="260px"
                />
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-white">
                {rec.title}
              </p>
              <p className="mt-1 text-xs text-white/50">{fmtDate(rec.publishedAt)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-white/40">
          No sermons match your filter
        </p>
      )}
    </section>
  );
}
