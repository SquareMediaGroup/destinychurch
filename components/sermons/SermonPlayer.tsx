"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCookieConsent } from "@/lib/cookieConsent";

interface SermonPlayerProps {
  videoId: string;
  thumbnail?: string;
}

export default function SermonPlayer({ videoId, thumbnail }: SermonPlayerProps) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canPlay = mounted && consent?.media === true;

  if (!mounted || !canPlay) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#111]">
        {/* Blurred thumbnail behind */}
        {thumbnail && (
          <Image
            src={thumbnail}
            alt=""
            fill
            className="object-cover opacity-30 blur-sm scale-105"
            sizes="(max-width: 1024px) 100vw, 740px"
          />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center">
          <span className="material-symbols-rounded text-5xl text-white/40">
            cookie
          </span>
          <div>
            <p className="text-base font-black text-white">
              Cookies required to play video
            </p>
            <p className="mt-1 max-w-xs text-sm text-white/50">
              YouTube uses cookies to serve this video. Accept them to watch.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={allowAll}
              className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/20 transition hover:brightness-110"
            >
              Accept all cookies
            </button>
            <button
              onClick={() => savePreferences({ media: true, analytics: false })}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Allow media only
            </button>
          </div>
        </div>
      </div>
    );
  }

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
