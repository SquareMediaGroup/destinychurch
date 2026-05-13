import AnimateIn from "@/components/AnimateIn";

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
          <div className="overflow-hidden rounded-2xl bg-black shadow-lg">
            <div className="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/WGoK046sqns"
                title="Promo Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
