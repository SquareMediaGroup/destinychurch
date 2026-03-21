"use client";

interface SermonPlayerProps {
  videoId: string;
}

export default function SermonPlayer({ videoId }: SermonPlayerProps) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&color=white`}
        title="Sermon video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
