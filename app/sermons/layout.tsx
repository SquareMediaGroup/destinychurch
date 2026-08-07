import { SermonPlayerProvider } from "@/lib/sermonPlayerContext";

export const revalidate = 3600;

export default async function SermonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SermonPlayerProvider>{children}</SermonPlayerProvider>;
}
