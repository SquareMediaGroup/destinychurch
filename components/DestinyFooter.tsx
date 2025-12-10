import Image from "next/image";
import Link from "next/link";

const footerSections = [
  {
    title: "Explore",
    links: [
      { label: "Sermons", href: "/sermons" },
      { label: "Playlists", href: "/playlists" },
      { label: "Admin", href: "/admin" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "About", href: "https://destinytees.uk/about" },
      { label: "Contact", href: "https://destinytees.uk/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Cookies", href: "/cookies" },
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
    ],
  },
];

export default function DestinyFooter() {
  return (
    <footer className="relative border-t border-[var(--border-subtle)] bg-[var(--surface)] transition-colors">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
      >
        <div className="absolute inset-x-6 bottom-0 h-32 bg-gradient-to-t from-destiny-orange/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-[180px]">
                <Image
                  src="/destiny-logo.svg"
                  alt="Destiny Church"
                  fill
                  sizes="180px"
                  className="object-contain logo-color"
                />
                <Image
                  src="/destiny-logo-color-white.svg"
                  alt="Destiny Church"
                  fill
                  sizes="180px"
                  className="object-contain logo-white"
                />
              </div>
            </div>
            <p className="text-sm text-destiny-grey/80">
              Weekly sermons, playlists, and resources from Destiny Church to
              keep you connected all week long.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-destiny-grey/70">
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-destiny-grey">
                Sundays at 10:30am
              </span>
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-destiny-grey">
                Online + in person
              </span>
            </div>
          </div>

          <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destiny-grey/70">
                  {section.title}
                </p>
                <div className="flex flex-col gap-2 text-sm font-medium text-destiny-grey/90">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="transition hover:text-destiny-orange"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-6 text-xs text-destiny-grey/70 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Destiny Church</span>
          <span className="text-destiny-grey/60">
            Built for the Destiny community
          </span>
        </div>
      </div>
    </footer>
  );
}
