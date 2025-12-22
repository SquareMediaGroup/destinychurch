import WatchHome from "@/components/WatchHome";

export const revalidate = 30;
export const runtime = "nodejs";

export default async function WatchPage() {
  return <WatchHome />;
}
