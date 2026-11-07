import AnimateIn from "@/components/AnimateIn";
import MediaEmbed from "@/components/missions/MediaEmbed";

export default function KidsCampVideo() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-4xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-4 text-center text-2xl font-black text-destiny-grey md:text-3xl">
            Promo Video
          </h2>
        </AnimateIn>
        <AnimateIn delay={100}>
          {/* Behind the media-cookie consent gate like every other YouTube embed,
              and on youtube-nocookie so nothing is set until playback starts. */}
          <div className="rounded-2xl shadow-lg">
            <MediaEmbed
              src="https://www.youtube-nocookie.com/embed/WGoK046sqns"
              title="Promo Video"
            />
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
