import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "Sermons", href: "/sermons" },
  { label: "Admin", href: "/admin" },
  { label: "About", href: "https://destinytees.uk/about" },
  { label: "Contact", href: "https://destinytees.uk/contact" },
];

export default function DestinyFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface)] transition-colors">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-destiny-grey lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-[140px]">
            <Image
              src="/destiny-logo.svg"
              alt="Destiny Church"
              fill
              sizes="140px"
              className="object-contain logo-color"
            />
            <Image
              src="/destiny-logo-color-white.svg"
              alt="Destiny Church"
              fill
              sizes="140px"
              className="object-contain logo-white"
            />
          </div>
          <p className="text-destiny-grey/80">Weekly sermons and resources.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wide text-destiny-grey/80">
          {footerLinks.map((link) => (
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
    </footer>
  );
}
