/**
 * Tiny Supabase REST wrapper used by GitHub Actions scripts to upsert
 * builder_pages rows. Avoids pulling the full @supabase/supabase-js client
 * into the script bundle when all we need is one POST/PATCH.
 */

import type { EditableText } from "./code-generator";

interface BuilderPageUpsert {
  slug: string;
  title: string;
  source_type: "code";
  source_path: string;
  editable_texts: EditableText[];
  repo_commit: string | null;
  status: "published";
}

function getEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return { url, key };
}

async function rest<T>(
  path: string,
  init: { method: string; body?: string; prefer?: string }
): Promise<T> {
  const { url, key } = getEnv();
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: init.prefer ?? "return=representation",
    },
    body: init.body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Supabase REST ${init.method} ${path} failed: ${resp.status} ${text}`);
  }
  return (await resp.json()) as T;
}

/**
 * Insert or update the builder_pages row for an AI-generated page so it shows
 * up in the /admin/builder dashboard. Looks up by slug because slug is the
 * stable, public identifier.
 */
export async function upsertCodePage(input: BuilderPageUpsert): Promise<{ id: string }> {
  // First check if a row already exists for this slug
  const existing = await rest<Array<{ id: string }>>(
    `builder_pages?slug=eq.${encodeURIComponent(input.slug)}&select=id`,
    { method: "GET" }
  );

  const row = {
    slug: input.slug,
    title: input.title,
    source_type: input.source_type,
    source_path: input.source_path,
    editable_texts: input.editable_texts,
    repo_commit: input.repo_commit,
    status: input.status,
    layout_json: [],
    published_at: new Date().toISOString(),
  };

  if (existing.length > 0) {
    const id = existing[0].id;
    await rest(`builder_pages?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(row),
    });
    return { id };
  }

  const inserted = await rest<Array<{ id: string }>>("builder_pages", {
    method: "POST",
    body: JSON.stringify(row),
  });
  return { id: inserted[0].id };
}

/**
 * Used by the edit-text workflow: load the row, return its current
 * editable_texts catalog and source_path.
 */
export async function loadCodePage(id: string): Promise<{
  slug: string;
  title: string;
  source_path: string;
  editable_texts: EditableText[];
}> {
  const rows = await rest<
    Array<{
      slug: string;
      title: string;
      source_path: string | null;
      editable_texts: EditableText[];
    }>
  >(
    `builder_pages?id=eq.${encodeURIComponent(id)}&source_type=eq.code&select=slug,title,source_path,editable_texts`,
    { method: "GET" }
  );
  if (rows.length === 0) {
    throw new Error(`No code-source builder_pages row with id=${id}`);
  }
  const row = rows[0];
  if (!row.source_path) {
    throw new Error(`builder_pages row ${id} has no source_path`);
  }
  return {
    slug: row.slug,
    title: row.title,
    source_path: row.source_path,
    editable_texts: row.editable_texts ?? [],
  };
}

export async function updateEditableTexts(
  id: string,
  editable_texts: EditableText[],
  repo_commit: string
): Promise<void> {
  await rest(`builder_pages?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      editable_texts,
      repo_commit,
      updated_at: new Date().toISOString(),
    }),
  });
}
