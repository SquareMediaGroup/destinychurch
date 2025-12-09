import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { href: "/sermons", label: "Sermons" },
  { href: "https://destinytees.uk/about", label: "About" },
  { href: "https://destinytees.uk/contact", label: "Contact" },
];

export default function DestinyHeader() {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-overlay)] text-[var(--foreground)] backdrop-blur transition-colors">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-[180px]">
            <Image
              src="/destiny-logo.svg"
              alt="Destiny Church"
              fill
              priority
              sizes="180px"
              className="object-contain logo-color"
            />
            <Image
              src="/destiny-logo-color-white.svg"
              alt="Destiny Church"
              fill
              priority
              sizes="180px"
              className="object-contain logo-white"
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-destiny-grey md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-destiny-orange"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/sermons"
            className="rounded-full bg-destiny-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
          >
            Watch sermons
          </Link>
        </div>
      </div>
    </header>
  );
}
