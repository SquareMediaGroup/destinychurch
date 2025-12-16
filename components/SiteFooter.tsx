import Image from "next/image";
import Link from "next/link";
import logoColor from "@/Logos/Destiny Church Full Logo Colour.svg";
import logoWhite from "@/Logos/Destiny Church Full Logo White.svg";

const primaryLinks = [
  { label: "Home", href: "/" },
  { label: "New here", href: "/new-here" },
  { label: "What’s on", href: "/whats-on" },
  { label: "Watch", href: "/watch" },
  { label: "Sermons", href: "/sermons" },
];

const connectLinks = [
  { label: "Connect", href: "/connect" },
  { label: "About", href: "/about" },
  { label: "Give", href: "/give" },
  { label: "Contact", href: "/contact" },
  { label: "Admin", href: "/admin" },
];

const socials = [
  { label: "Facebook", href: "https://facebook.com" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "YouTube", href: "https://youtube.com" },
];

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0d1119] text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr] lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-5">
            <div className="relative h-11 w-[200px]">
              <Image
                src={logoColor}
                alt="Destiny Church"
                fill
                sizes="200px"
                className="object-contain logo-color"
              />
              <Image
                src={logoWhite}
                alt="Destiny Church"
                fill
                sizes="200px"
                className="object-contain logo-white"
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
              <p>Stockton-on-Tees · TS20 2QQ · enquires@destinytees.uk</p>
              <p>+44 (0) 1642 559 797</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Destiny Church</span>
          <span className="text-white/50">
            Destiny Church Tees Valley · Company No. 06261423
          </span>
        </div>
      </div>
    </footer>
  );
}
