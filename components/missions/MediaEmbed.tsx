"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import EmbedLoadingOverlay from "@/components/ui/EmbedLoadingOverlay";
import { useCookieConsent } from "@/lib/cookieConsent";

interface Props {
  src: string;
  title: string;
  thumbnail?: string;
}

export default function MediaEmbed({ src, title, thumbnail }: Props) {
  const { consent, allowAll, savePreferences } = useCookieConsent();
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const canPlay = mounted && consent?.media === true;

  if (!mounted || !canPlay) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#111]">
        {thumbnail && (
          <Image
            src={thumbnail}
            alt=""
            fill
            className="object-cover opacity-30 blur-sm scale-105"
            sizes="(max-width: 1024px) 100vw, 640px"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center">
          <span className="material-symbols-rounded text-5xl text-white/40">cookie</span>
          <div>
            <p className="text-base font-black text-white">Cookies required to play video</p>
            <p className="mt-1 max-w-xs text-sm text-white/50">Accept cookies to watch this video.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={allowAll}
              className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Accept all cookies
            </button>
            <button
              onClick={() => savePreferences({ media: true, analytics: false })}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Necessary + media only, no tracking
            </button>
          </div>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-white/40">
            By accepting, you agree to our{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-destiny-orange">Privacy Policy</Link>{" "}
            and{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-destiny-orange">Terms of Use</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      {/* No new-tab fallback here: a slow video is a wait, not a blocked
          errand, and YouTube's own player is what would open anyway. */}
      <EmbedLoadingOverlay loaded={loaded} tone="dark" />
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
