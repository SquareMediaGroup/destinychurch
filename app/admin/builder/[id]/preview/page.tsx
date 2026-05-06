import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/utils/supabase/service";
import BuilderPageRenderer from "@/components/builder/BuilderPageRenderer";
import type { BuilderElement } from "@/lib/builder/types";

export const dynamic = "force-dynamic";

export default async function BuilderPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .select("id, slug, title, status, layout_json")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const layout: BuilderElement[] = Array.isArray(data.layout_json) ? data.layout_json : [];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-black/8 bg-amber-50 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 text-amber-800">
          <span className="material-symbols-rounded text-base">visibility</span>
          <span className="font-bold">Preview</span>
          <span className="opacity-70">— {data.title} ({data.status})</span>
        </div>
        <Link
          href={`/admin/builder/${id}`}
          className="rounded-md bg-white px-3 py-1 font-bold text-destiny-grey hover:bg-amber-100"
        >
          Back to editor
        </Link>
      </div>
      <BuilderPageRenderer layout={layout} />
    </div>
  );
}
