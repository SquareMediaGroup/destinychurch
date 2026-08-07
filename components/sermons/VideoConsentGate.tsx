"use client";

import Image from "next/image";
import Link from "next/link";
import { useCookieConsent } from "@/lib/cookieConsent";

/**
 * The "accept cookies to watch" placeholder shown in place of a YouTube embed.
 *
 * Fills its positioned parent (`absolute inset-0`), so give it a wrapper with
 * the video's aspect ratio. It stays dark on purpose even on the light pages —
 * it occupies a video frame, and video frames are black everywhere.
 *
 * Shared by the featured card on /sermons and the full player on /sermons/[id].
 */
export default function VideoConsentGate({
  thumbnail,
  sizes = "(max-width: 1024px) 100vw, 740px",
}: {
  thumbnail?: string;
  sizes?: string;
}) {
  const { allowAll, savePreferences } = useCookieConsent();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-[#111]">
      {thumbnail && (
        <Image
          src={thumbnail}
          alt=""
          aria-hidden="true"
          fill
          className="scale-105 object-cover opacity-30 blur-sm"
          sizes={sizes}
        />
      )}
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
            Necessary + media only, no tracking
          </button>
        </div>
        <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-white/40">
          By accepting, you agree to our{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-destiny-orange"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-destiny-orange"
          >
            Terms of Use
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
