import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type OrangeButtonProps = {
  href?: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function OrangeButton({
  href,
  children,
  className,
  ...buttonProps
}: OrangeButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange";

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${className ?? ""}`}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`${baseClasses} ${className ?? ""}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
