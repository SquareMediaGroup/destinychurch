import Link from "next/link";
import Image from "next/image";

const churchLinks = [
  { label: "Homepage", href: "/" },
  { label: "What's on", href: "/whats-on" },
  { label: "About us", href: "/about" },
  { label: "Serve", href: "/serve" },
  { label: "Give", href: "/give" },
  { label: "Hire", href: "/hire" },
];

const connectLinks = [
  { label: "New Here?", href: "/new-here" },
  { label: "Plan a Visit", href: "/visit" },
  { label: "Connect Card", href: "/connect-card" },
  { label: "Join a Team", href: "/serve" },
  { label: "Connect Groups", href: "/connect" },
  { label: "Baptism", href: "/baptism" },
  { label: "Child Dedication", href: "/child-dedication" },
  { label: "Destiny Recovery", href: "/destiny-recovery" },
];

const legalLinks = [
  { label: "Data & GDPR Policy", href: "/data-gdpr" },
  { label: "Safeguarding Policy", href: "/safeguarding" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Contact Us", href: "/contact" },
];

export default function ChurchFooter() {
  return (
    <footer className="border-t border-white/5 text-white" style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="space-y-5">
            <Link href="/" aria-label="Destiny Church" className="-ml-[30px] -mt-[7px] block">
              <div className="relative h-11 w-[200px]">
                <Image
                  src="/img/brand/destiny-logo-color-white.svg"
                  alt="Destiny Church"
                  fill
                  sizes="200px"
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="max-w-[220px] text-sm text-white/70">
              Destiny Church Tees Valley is a multi-cultural church where all
              can find a place to belong and thrive. We&apos;d love to welcome
              you through our doors!
            </p>
            <div className="text-sm text-white/70">
              <p className="font-bold text-white/90">Destiny Centre</p>
              <p>Norton Road</p>
              <p>Stockton-on-Tees</p>
              <p>TS20 2QQ</p>
            </div>
          </div>

          {/* Church column */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-white">Church</p>
            <div className="grid gap-2 text-sm">
              {churchLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Connect column */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-white">Connect</p>
            <div className="grid gap-2 text-sm">
              {connectLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal column */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-white">Legal</p>
            <div className="grid gap-2 text-sm">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy;{new Date().getFullYear()} Destiny Church Tees Valley &middot;
            Reg Charity No. 1119951
          </span>
          <span>
            Telephone:{" "}
            <a
              href="tel:+441642559797"
              className="underline underline-offset-2 transition hover:text-white"
            >
              01642 559797
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
