import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/utils/supabase/service";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SlugRedirectPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("redirects")
    .select("target_url")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!data) notFound();
  redirect(data.target_url);
}
