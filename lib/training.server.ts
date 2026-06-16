// Server-only data fetchers for the public /training pages.
// Crucially, password_hash is NEVER selected into a shape returned to a page —
// callers only ever see `has_password`.
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";
import type {
  TrainingCategory,
  TrainingSubgroup,
  TrainingPost,
  TrainingCategoryWithSubgroups,
} from "@/lib/training";

// Columns safe to expose for a sub-group: everything except password_hash.
// `password_hash is not null` is aliased to has_password by post-processing.
const SUBGROUP_PUBLIC_COLUMNS =
  "id, category_id, name, slug, description, sort_order, is_published, created_at, updated_at, password_hash";

type SubgroupRow = Omit<TrainingSubgroup, "has_password"> & {
  password_hash: string | null;
};

function toPublicSubgroup(row: SubgroupRow): TrainingSubgroup {
  const { password_hash, ...rest } = row;
  return { ...rest, has_password: !!password_hash };
}

/** Published categories with their published sub-groups, ordered for display. */
export async function getTrainingTree(): Promise<TrainingCategoryWithSubgroups[]> {
  const supabase = getSupabaseAdmin();

  const { data: categories, error: catErr } = await supabase
    .from("training_categories")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (catErr) {
    console.error("getTrainingTree categories error:", catErr.message);
    return [];
  }

  const { data: subgroups, error: subErr } = await supabase
    .from("training_subgroups")
    .select(SUBGROUP_PUBLIC_COLUMNS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (subErr) {
    console.error("getTrainingTree subgroups error:", subErr.message);
  }

  const byCategory = new Map<string, TrainingSubgroup[]>();
  for (const row of (subgroups ?? []) as SubgroupRow[]) {
    const pub = toPublicSubgroup(row);
    const list = byCategory.get(pub.category_id) ?? [];
    list.push(pub);
    byCategory.set(pub.category_id, list);
  }

  return ((categories ?? []) as TrainingCategory[]).map((c) => ({
    ...c,
    subgroups: byCategory.get(c.id) ?? [],
  }));
}

/** A single published category by slug, or null. */
export async function getCategoryBySlug(
  slug: string,
): Promise<TrainingCategory | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("training_categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("getCategoryBySlug error:", error.message);
    return null;
  }
  return (data as TrainingCategory) ?? null;
}

/** Published sub-groups for a category id, ordered. */
export async function getSubgroupsForCategory(
  categoryId: string,
): Promise<TrainingSubgroup[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("training_subgroups")
    .select(SUBGROUP_PUBLIC_COLUMNS)
    .eq("category_id", categoryId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getSubgroupsForCategory error:", error.message);
    return [];
  }
  return ((data ?? []) as SubgroupRow[]).map(toPublicSubgroup);
}

/** A published sub-group by category + sub-group slug, or null. */
export async function getSubgroupBySlugs(
  categorySlug: string,
  subgroupSlug: string,
): Promise<{ category: TrainingCategory; subgroup: TrainingSubgroup } | null> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("training_subgroups")
    .select(SUBGROUP_PUBLIC_COLUMNS)
    .eq("category_id", category.id)
    .eq("slug", subgroupSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getSubgroupBySlugs error:", error.message);
    return null;
  }
  return { category, subgroup: toPublicSubgroup(data as SubgroupRow) };
}

/** Published posts for a sub-group id, ordered. */
export async function getPublishedPosts(
  subgroupId: string,
): Promise<TrainingPost[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("training_posts")
    .select("*")
    .eq("subgroup_id", subgroupId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getPublishedPosts error:", error.message);
    return [];
  }
  return (data ?? []) as TrainingPost[];
}

/** A published post within a sub-group, by all three slugs. */
export async function getPostBySlugs(
  categorySlug: string,
  subgroupSlug: string,
  postSlug: string,
): Promise<{
  category: TrainingCategory;
  subgroup: TrainingSubgroup;
  post: TrainingPost;
} | null> {
  const found = await getSubgroupBySlugs(categorySlug, subgroupSlug);
  if (!found) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("training_posts")
    .select("*")
    .eq("subgroup_id", found.subgroup.id)
    .eq("slug", postSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("getPostBySlugs error:", error.message);
    return null;
  }
  return { ...found, post: data as TrainingPost };
}
