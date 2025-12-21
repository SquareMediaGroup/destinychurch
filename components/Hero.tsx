import Image from "next/image";
import type { ReactNode } from "react";
import CTAButton from "./CTAButton";

type Action = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

type HeroProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  backgroundImage?: string;
  children?: ReactNode;
};

export default function Hero({
  kicker,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  backgroundImage,
  children,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0c1119] via-[#0e1523] to-[#0a0f18] text-white shadow-2xl">
      {backgroundImage && (
        <div className="absolute inset-0">
          <Image
            src={backgroundImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover brightness-[0.55]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-[#0c1119]/70" />
        </div>
      )}
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="flex flex-col gap-4 sm:max-w-3xl">
          {kicker && (
            <span className="subheading inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-destiny-orange" />
              {kicker}
            </span>
          )}
          <h1 className="text-4xl font-bold leading-tight !text-white sm:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-white/80 sm:text-xl">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {primaryAction && (
            <CTAButton href={primaryAction.href} variant="primary">
              {primaryAction.label}
            </CTAButton>
          )}
          {secondaryAction && (
            <CTAButton
              href={secondaryAction.href}
              variant={secondaryAction.variant ?? "secondary"}
            >
              {secondaryAction.label}
            </CTAButton>
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
