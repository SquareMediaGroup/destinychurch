import Link from "next/link";
import Image from "next/image";
import { isYouTubeQuotaExceeded } from "@/lib/youtube";
import ReportBugLink from "@/components/report-bug/ReportBugLink";
import FooterLinkGroup from "@/components/FooterLinkGroup";
import { LocaleSelector } from "gt-next";

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
  { label: "Governance", href: "/governance" },
  { label: "Data & GDPR Policy", href: "/data-gdpr" },
  { label: "Safeguarding Policy", href: "/safeguarding" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Contact Us", href: "/contact" },
];

export default async function ChurchFooter() {
  const quotaExceeded = await isYouTubeQuotaExceeded();

  const churchLinks = [
    { label: "Homepage", href: "/" },
    { label: "What's on", href: "/whats-on" },
    { label: "About us", href: "/about" },
    ...(!quotaExceeded ? [{ label: "Sermons", href: "/sermons" }] : []),
    { label: "Serve", href: "/serve" },
    { label: "Shop", href: "/shop" },
    { label: "Give", href: "/give" },
    { label: "Hire", href: "/hire" },
    { label: "MyChurchsuite", href: "https://destinytees.churchsuite.com", external: true },
  ];

  return (
    <footer className="border-t border-white/5 text-white" style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="grid gap-0 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:gap-10">
          {/* Brand column */}
          <div className="space-y-5 pb-6 md:pb-0">
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

          {/* Link columns — accordions on mobile, plain columns from md: up */}
          <FooterLinkGroup title="Church" links={churchLinks} />
          <FooterLinkGroup title="Connect" links={connectLinks} />
          <FooterLinkGroup title="Legal" links={legalLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy; {new Date().getFullYear()}{" "}Destiny Church Tees Valley &middot;{" "}
            <Link
              href="/governance"
              className="underline underline-offset-2 transition hover:text-white"
            >
              Reg Charity No. 1119951
            </Link>
          </span>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <LocaleSelector />
            <ReportBugLink />
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
      </div>
    </footer>
  );
}
