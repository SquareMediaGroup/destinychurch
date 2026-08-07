const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@DestinyOnlineChurch";

/** Editorial call-out pointing people to the full sermon archive on YouTube. */
export default function WatchOnYouTubeBand({
  eyebrow = "Prefer to watch?",
}: {
  eyebrow?: string;
}) {
  return (
    // The site's sanctioned dark band (see ministry/SplitSection tone="dark").
    <div
      className="relative overflow-hidden rounded-3xl px-7 py-12 sm:px-12 sm:py-16"
      style={{
        background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(253,0,0,0.18), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
            Every sermon, on the big screen.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/65">
            Our full back-catalogue of services lives on YouTube — worship,
            testimonies and the full message, all in one place.
          </p>
        </div>

        <a
          href={YOUTUBE_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-bold text-destiny-grey shadow-xl transition hover:scale-[1.03]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-[#FF0000]"
            fill="currentColor"
            aria-hidden
          >
            <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.6 15.57V8.43L15.82 12l-6.22 3.57Z" />
          </svg>
          Watch on YouTube
        </a>
      </div>
    </div>
  );
}
