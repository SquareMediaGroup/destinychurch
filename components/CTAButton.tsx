import Link from "next/link";
import type { ReactNode } from "react";

type CTAButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
};

export default function CTAButton({
  href,
  children,
  variant = "primary",
  className = "",
  onClick,
}: CTAButtonProps) {
  const isExternal = href.startsWith("http");
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const variantStyles: Record<typeof variant, string> = {
    primary:
      "bg-destiny-orange text-white shadow-lg shadow-destiny-orange/20 hover:brightness-95 focus-visible:outline-destiny-orange",
    secondary:
      "border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20 focus-visible:outline-white",
    ghost:
      "border border-destiny-orange/40 bg-transparent text-destiny-orange hover:border-destiny-orange hover:bg-destiny-orange/10 focus-visible:outline-destiny-orange",
  };

  const styles = [baseStyles, variantStyles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      className={styles}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer noopener" : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
