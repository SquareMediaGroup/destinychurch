import type { Metadata } from "next";

// Per-visitor pages: nothing here is worth a search result.
export const metadata: Metadata = {
  title: "Your basket",
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
