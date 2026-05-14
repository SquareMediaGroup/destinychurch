import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("builder_pages")
    .select("title")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (data?.title) return { title: data.title };
  return {};
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: redirectRow } = await supabase
    .from("redirects")
    .select("target_url")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (redirectRow) redirect(redirectRow.target_url);
  notFound();
}
