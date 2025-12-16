import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  title: string;
  description?: string;
  href?: string;
  eyebrow?: string;
  meta?: string;
  cta?: string;
  backgroundImage?: string;
  tone?: "light" | "dark";
  children?: ReactNode;
  className?: string;
};

export default function Card({
  title,
  description,
  href,
  eyebrow,
  meta,
  cta = "Learn more",
  backgroundImage,
  tone = "light",
  children,
  className = "",
}: CardProps) {
  const Wrapper = href ? Link : "div";
  const sharedClasses =
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border transition duration-200";
  const toneClasses =
    tone === "dark"
      ? "border-white/10 bg-gradient-to-br from-black/70 via-black/50 to-[#0b1522] text-white"
      : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:border-destiny-orange/60";
  const hoverClasses =
    "hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange";

  return (
    <Wrapper
      href={href || "#"}
      className={`${sharedClasses} ${toneClasses} ${hoverClasses} ${className}`}
    >
      {backgroundImage && (
        <div className="absolute inset-0">
          <Image
            src={backgroundImage}
            alt=""
            fill
            priority={false}
            sizes="(min-width: 1024px) 360px, 100vw"
            className="object-cover brightness-[0.8] transition duration-200 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-transparent" />
        </div>
      )}

      <div className="relative flex flex-1 flex-col gap-3 p-5">
        {eyebrow && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-destiny-orange/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-destiny-orange">
            <span className="h-1.5 w-1.5 rounded-full bg-destiny-orange" />
            {eyebrow}
          </span>
        )}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight">{title}</h3>
          {description && (
            <p
              className={`text-sm ${
                tone === "dark" ? "text-white/80" : "text-destiny-grey/90"
              }`}
            >
              {description}
            </p>
          )}
        </div>
        {children}
        <div className="mt-auto flex items-center justify-between text-sm font-semibold">
          <span className="text-destiny-orange">{cta}</span>
          {meta && (
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                tone === "dark"
                  ? "bg-white/10 text-white/80"
                  : "bg-[var(--surface-muted)] text-destiny-grey"
              }`}
            >
              {meta}
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
