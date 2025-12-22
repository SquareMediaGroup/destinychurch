"use client";

import Link from "next/link";
import LogoImage from "./LogoImage";
import ThemeToggle from "./ThemeToggle";

const primaryLinks = [
  { label: "Home", href: "/" },
  { label: "New here", href: "https://destinytees.uk/new-here" },
  { label: "What’s on", href: "https://destinytees.uk/whats-on" },
  { label: "Sermons", href: "/sermons" },
];

const connectLinks = [
  { label: "Connect", href: "https://destinytees.uk/connect" },
  { label: "About", href: "https://destinytees.uk/about" },
  { label: "Give", href: "https://destinytees.uk/give" },
  { label: "Contact", href: "https://destinytees.uk/contact" },
  { label: "Admin", href: "/admin" },
];

const socials = [
  { label: "Facebook", href: "https://facebook.com/destinyteesvalley" },
  { label: "Instagram", href: "https://instagram.com/destinychurchteesvalley" },
  { label: "YouTube", href: "https://youtube.com/destinychurchteesvalley" },
];

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0d1119] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr] lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <div className="relative h-11 w-[200px]">
              <LogoImage
                src="/destiny-logo-color-white.svg"
                alt="Destiny Church"
                fill
                sizes="200px"
                className="object-contain"
              />
            </div>
            <p className="max-w-md text-sm text-white/70">
              Destiny Church Tees Valley is a welcoming, Christ-centred home for
              Stockton, Teesside, and beyond. Join us in person or online this
              Sunday.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Sundays 11:00am
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                In person + online
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Explore
            </p>
            <div className="grid gap-2 text-sm font-semibold">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/80 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Connect
            </p>
            <div className="grid gap-2 text-sm font-semibold">
              {connectLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/80 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Follow along
            </p>
            <div className="grid gap-2 text-sm font-semibold">
              {socials.map((social) => (
                <Link
                  key={social.href}
                  href={social.href}
                  className="text-white/80 transition hover:text-white"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {social.label}
                </Link>
              ))}
            </div>
            <div className="text-sm text-white/70">
              <p>Destiny Centre, 395 Norton Road</p>
              <p className="flex flex-wrap items-center gap-2 text-white/60">
                <a
                  href="https://maps.apple.com/?q=Destiny%20Centre%2C%20395%20Norton%20Road%2C%20Stockton-on-Tees%20TS20%202QQ"
                  className="underline underline-offset-2 transition hover:text-white"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open in Maps
                </a>
                <span aria-hidden>·</span>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Destiny%20Centre%2C%20395%20Norton%20Road%2C%20Stockton-on-Tees%20TS20%202QQ"
                  className="underline underline-offset-2 transition hover:text-white"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open in Google Maps
                </a>
              </p>
              <p>
                <a
                  href="mailto:enquires@destinytees.uk"
                  className="underline underline-offset-2 transition hover:text-white"
                >
                  enquires@destinytees.uk
                </a>
              </p>
              <p>
                <a
                  href="tel:+441642559797"
                  className="underline underline-offset-2 transition hover:text-white"
                >
                  +44 (0) 1642 559 797
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <a href="https://sermons.destinytees.uk" className="text-white/50">
            <span>© {new Date().getFullYear()} Destiny Sermons </span>
          </a>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/settings"
              aria-label="Settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
            >
              <span className="material-symbols-rounded text-[20px]" aria-hidden="true">
                settings
              </span>
            </Link>
            <ThemeToggle />
            <a href="https://destinytees.uk" className="text-white/50">
              <span className="text-white/50">
                Destiny Church Tees Valley · Company No. 06261423
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
