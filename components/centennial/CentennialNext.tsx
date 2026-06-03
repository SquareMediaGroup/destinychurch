import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function CentennialNext() {
  return (
    <section className="cent-grain bg-[#f7f1e8]">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28 lg:px-8">
        <AnimateIn>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-destiny-orange">
            The Next Hundred
          </p>
          <hr className="cent-rule mx-auto mt-6 w-16" />
        </AnimateIn>

        <AnimateIn delay={100}>
          <h2
            className="mt-8 text-3xl leading-snug text-[#2c1a0e] sm:text-4xl md:text-[2.75rem]"
            style={{ fontFamily: "var(--font-playfair)", fontWeight: 600 }}
          >
            The best chapter of our story hasn&apos;t been written yet.
          </h2>
        </AnimateIn>

        <AnimateIn delay={180}>
          <p className="mt-8 text-base leading-relaxed text-[#5a4a3a] sm:text-lg">
            A hundred years ago, seven families could never have imagined what
            their small step of faith would become. Today we stand on their
            shoulders and look forward with the same hope. Whether you have been
            here for fifty years or are stepping through the door for the first
            time &mdash; there is a place for you in the next chapter.
          </p>
        </AnimateIn>

        <AnimateIn delay={240}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/visit"
              className="rounded-full bg-destiny-orange px-8 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              Plan Your Visit
            </Link>
            <Link
              href="/about"
              className="rounded-full border-2 border-[#2c1a0e]/20 px-8 py-3 text-sm font-bold text-[#2c1a0e] transition hover:border-[#2c1a0e]/50 hover:bg-[#2c1a0e]/5"
            >
              More About Us
            </Link>
          </div>
        </AnimateIn>

        {/* Commemorative seal */}
        <AnimateIn delay={320}>
          <div className="mt-16 flex flex-col items-center">
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#b8842f]" />
              <span
                className="cent-gold-text text-2xl"
                style={{ fontFamily: "var(--font-playfair)", fontWeight: 700 }}
              >
                Est. 1926
              </span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#b8842f]" />
            </div>

            {/*
              PLACEHOLDER COPYRIGHT — fake details, to be replaced before launch.
              Update the year range, legal entity and charity number as needed.
            */}
            <p className="mt-6 text-xs leading-relaxed text-[#8a7355]">
              &copy; 1926&ndash;2026 Destiny Church Centennial &middot; Placeholder
              copyright &mdash; to be confirmed
              <br />
              All names, dates and historical details on this page are
              illustrative placeholders pending verification.
            </p>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
