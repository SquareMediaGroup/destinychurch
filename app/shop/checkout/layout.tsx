import type { Metadata } from "next";

// Per-visitor pages (checkout and its success screen): nothing here is worth a
// search result.
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: true },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
