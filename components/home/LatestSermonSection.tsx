import Image from "next/image";
import Link from "next/link";
import { getLatestVisibleVideo } from "@/lib/sermons";
import { formatDate } from "@/lib/youtube";
import ScrollSpeedGlow from "@/components/home/ScrollSpeedGlow";

export default async function LatestSermonSection() {
  const video = await getLatestVisibleVideo();
  if (!video) return null;

  const date = formatDate(video.publishedAt);
  const shortDesc = video.description.slice(0, 160).trim();

  return (
    <div className="px-4 py-8 lg:px-8">
     <ScrollSpeedGlow />
     <div className="glowing-gradient-border rounded-3xl">
      <section className="relative w-full overflow-hidden rounded-3xl">
        {/* Blurred thumbnail background */}
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center blur-sm"
          style={{ backgroundImage: `url('${video.thumbnail}')` }}
        />
        {/* Near-black tint of the destiny-grey accent (#363f48 → ~25% brightness) */}
        <div className="absolute inset-0 bg-[#0b0f14]/70" />

        {/* Content */}
        <div className="relative flex min-h-[320px] items-center sm:min-h-[480px]">
          <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-10 lg:px-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">

            {/* Left column */}
            <div className="flex flex-col justify-center md:w-1/2">
              <span className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Latest Sermon
              </span>
              <h2 className="mb-3 text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">
                {video.title}
              </h2>
              {date && (
                <p className="mb-4 text-sm text-white/60">{date}</p>
              )}
              {shortDesc && (
                <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-white/70 md:text-base">
                  {shortDesc}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/sermons/${video.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 sm:px-6 sm:py-3 sm:text-sm"
                >
                  <span className="material-symbols-rounded text-base">play_arrow</span>
                  Watch Now
                </Link>
                <Link
                  href="/sermons"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-5 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:border-white/70 hover:bg-white/10 sm:px-6 sm:py-3 sm:text-sm"
                >
                  See All Sermons
                </Link>
              </div>
            </div>

            {/* Right column — thumbnail with play button */}
            <div className="md:w-1/2">
              <Link
                href={`/sermons/${video.id}`}
                className="group relative block overflow-hidden rounded-3xl shadow-2xl"
                style={{ aspectRatio: "16/9" }}
              >
                <Image
                  src={video.thumbnail}
                  alt={video.title}
                  fill
                  className="object-cover transition duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition duration-300 group-hover:bg-black/30">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl transition duration-300 group-hover:scale-110 group-hover:bg-white">
                    <span className="material-symbols-rounded text-3xl text-destiny-orange" style={{ paddingLeft: "3px" }}>
                      play_arrow
                    </span>
                  </div>
                </div>
              </Link>
            </div>

            </div>
          </div>
        </div>
      </section>
     </div>
    </div>
  );
}
