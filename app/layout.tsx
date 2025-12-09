import type { Metadata } from "next";
import { Dosis, Roboto } from "next/font/google";
import "./globals.css";
import DestinyFooter from "@/components/DestinyFooter";
import DestinyHeader from "@/components/DestinyHeader";
import Providers from "@/components/Providers";

const roboto = Roboto({
  variable: "--font-roboto",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dosis = Dosis({
  variable: "--font-dosis",
  display: "swap",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Destiny Sermons",
  description:
    "Weekly Destiny Church sermons with video, summaries, and transcripts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${dosis.variable} antialiased transition-colors`}
      >
        <Providers>
          <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
            <DestinyHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 lg:px-8">
              {children}
            </main>
            <DestinyFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
