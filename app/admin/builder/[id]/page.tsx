import { notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";
import BuilderEditor from "@/components/builder/BuilderEditor";
import type { BuilderPage } from "@/lib/builder/types";

export const dynamic = "force-dynamic";

export default async function BuilderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const page: BuilderPage = {
    id: data.id,
    slug: data.slug,
    title: data.title,
    layout_json: Array.isArray(data.layout_json) ? data.layout_json : [],
    status: data.status,
    template_id: data.template_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    published_at: data.published_at,
  };

  return <BuilderEditor initialPage={page} />;
}
