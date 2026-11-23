import Providers from "@/components/Providers";
import SkipToMainLink from "@/components/layout/SkipToMainLink";

export default function StandaloneLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <SkipToMainLink />
      <main
        id="main"
        tabIndex={-1}
        className="min-h-screen flex-1 focus:outline-none"
      >
        {children}
      </main>
    </Providers>
  );
}