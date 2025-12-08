import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SermonWatchPageProps = {
  params: { id: string };
};

export default async function SermonWatchPage({ params }: SermonWatchPageProps) {
  const rawParam = params.id ?? "";
  const decodedId = rawParam ? decodeURIComponent(rawParam).trim() : "";
  const target = decodedId || rawParam;
  redirect(`/sermons/view?viewId=${encodeURIComponent(target)}`);
}
