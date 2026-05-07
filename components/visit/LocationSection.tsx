"use client";

import AnimateIn from "@/components/AnimateIn";

export default function LocationSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 md:gap-20">
          <AnimateIn>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Where We Meet
              </p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                Find Us
              </h2>
              <div className="mb-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">place</span>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-destiny-grey">Address</p>
                    <p className="text-sm leading-relaxed text-destiny-grey/60">
                      Destiny Church Tees Valley<br />
                      Unit 5, Riverside Park<br />
                      Middlesbrough Road<br />
                      Middlesbrough<br />
                      TS2 1RU
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">directions_car</span>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-bold text-destiny-grey">Getting Here</p>
                    <p className="text-sm leading-relaxed text-destiny-grey/60">
                      Free parking available on-site. Easily accessible from the A66 and A19.
                    </p>
                  </div>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=Destiny+Church+Tees+Valley+Middlesbrough"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
              >
                <span className="material-symbols-rounded text-base">map</span>
                Open in Google Maps
              </a>
            </div>
          </AnimateIn>

          <AnimateIn delay={100}>
            <div className="overflow-hidden rounded-3xl shadow-lg">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2291.234567890123!2d-1.234567890123456!3d54.56789012345678!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTTCsDM0JzA0LjQiTiAxwrAxNCcwNC40Ilc!5e0!3m2!1sen!2suk!4v1234567890123!5m2!1sen!2suk"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Destiny Church Tees Valley Location"
              />
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
