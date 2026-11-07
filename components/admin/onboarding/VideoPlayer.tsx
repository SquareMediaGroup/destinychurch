"use client";

// One help video: the YouTube embed (behind the media-cookie gate), or its
// poster marked "coming soon" until it has been uploaded. Shared by /admin/help
// and the onboarding dialog so the two can't disagree about what "published"
// looks like.

import MediaEmbed from "@/components/missions/MediaEmbed";
import type { AdminHelpVideo } from "@/lib/adminHelpVideos";

export default function VideoPlayer({ video }: { video: AdminHelpVideo }) {
  if (video.youtubeId) {
    return (
      <MediaEmbed
        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
        title={video.title}
        thumbnail={video.poster}
      />
    );
  }
  if (video.poster) {
    // Made, not on YouTube yet: the still, marked as coming.
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#f5f7fa]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={video.poster} alt="" className="h-full w-full object-cover opacity-60" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-4 py-2 text-sm font-bold text-destiny-grey shadow-sm">
          Video coming soon
        </span>
      </div>
    );
  }
  return null;
}
