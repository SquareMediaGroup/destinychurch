import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import { CHANNEL_URL, type YTVideo, formatDate } from "@/lib/youtube";

/**
 * Latest Sermon — dark image banner, matching the WorshipWithUs section pattern
 * (rounded-3xl card, blurred backdrop, left-to-right black gradient, white
 * font-black heading, orange + ghost buttons, AnimateIn staggered reveals).
 */
export default function LatestSermonSection({
  video,
  quotaExceeded = false,
}: {
  video: YTVideo | null;
  quotaExceeded?: boolean;
}) {
  if (!video) return null;

  const date = formatDate(video.publishedAt);

  // Upload titles often read "Message Title || Ps Speaker"; lift the speaker out.
  const [rawTitle, ...speakerParts] = video.title.split("||");
  const title = rawTitle.trim();
  const speaker = speakerParts.join("||").trim();

  const watchHref = quotaExceeded
    ? `https://www.youtube.com/watch?v=${video.id}`
    : `/sermons/${video.id}`;
  const allHref = quotaExceeded ? CHANNEL_URL : "/sermons";
  const allLabel = quotaExceeded ? "Watch on YouTube" : "See All Sermons";
  const external = quotaExceeded
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <div className="px-4 py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        {/* Blurred thumbnail backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center blur-md"
          style={{ backgroundImage: `url('${video.thumbnail}')` }}
        />
        {/* DC brand gradient overlay — same treatment as the Courses
            "Keep Growing in Faith" card on the What's On page */}
        <div aria-hidden className="absolute inset-0 opacity-65">
          <Image
            src="/img/brand/DCgradient.webp"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            aria-hidden="true"
          />
        </div>
        {/* Black to transparent overlay */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"
        />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-12 sm:px-10 sm:py-14 md:flex-row md:items-center md:gap-12 lg:px-12">
          {/* Left — message details */}
          <div className="w-full md:w-1/2">
            <AnimateIn>
              <p className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                <span className="h-px w-8 bg-destiny-orange/70" />
                Latest Sermon
              </p>
            </AnimateIn>

            <AnimateIn delay={80}>
              <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">
                {title}
              </h2>
            </AnimateIn>

            {(speaker || date) && (
              <AnimateIn delay={130}>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60">
                  {speaker && <span className="font-semibold text-white/80">{speaker}</span>}
                  {speaker && date && (
                    <span aria-hidden className="h-1 w-1 rounded-full bg-destiny-orange" />
                  )}
                  {date && <span>{date}</span>}
                </p>
              </AnimateIn>
            )}

            <AnimateIn delay={230}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={watchHref}
                  {...external}
                  className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                >
                  <span className="material-symbols-rounded text-base">play_arrow</span>
                  Watch Now
                </Link>
                <Link
                  href={allHref}
                  {...external}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:border-white/70 hover:bg-white/10"
                >
                  {allLabel}
                </Link>
              </div>
            </AnimateIn>
          </div>

          {/* Right — thumbnail card with play button */}
          <AnimateIn delay={150} className="w-full md:w-1/2">
            <Link
              href={watchHref}
              {...external}
              aria-label={`Watch: ${title}`}
              className="group relative block overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Image
                src={video.thumbnail}
                alt={title}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-black/20 transition duration-300 group-hover:bg-black/30"
              />

              {/* On-brand orange badge (matches WhatsOn event cards) */}
              <span className="absolute left-3 top-3 rounded-full bg-destiny-orange px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                New Message
              </span>

              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl transition duration-300 group-hover:scale-110 group-hover:bg-white">
                  <span
                    className="material-symbols-rounded text-3xl text-destiny-orange"
                    style={{ paddingLeft: "3px" }}
                  >
                    play_arrow
                  </span>
                </div>
              </div>
            </Link>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
