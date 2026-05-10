import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const GITHUB_TOKEN = process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "SquareMediaGroup/destinychurch";

export const runtime = "nodejs";

/**
 * POST /api/admin/builder/code/[id]/edit
 * Body: { edits: { id: string; value: string }[] }
 *
 * Dispatches the ai-edit-text workflow which applies the edits to the source
 * files, type-checks, commits, pushes, and updates the editable_texts catalog
 * in the DB.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const edits = (body as Record<string, unknown>).edits;
  if (!Array.isArray(edits) || edits.length === 0) {
    return NextResponse.json({ error: "edits must be a non-empty array" }, { status: 400 });
  }

  // Validate edit shape; cap value length to 5000 chars to avoid abuse.
  const cleaned: Array<{ id: string; value: string }> = [];
  for (const e of edits) {
    if (typeof e !== "object" || e === null) continue;
    const editId = (e as Record<string, unknown>).id;
    const editValue = (e as Record<string, unknown>).value;
    if (typeof editId !== "string" || typeof editValue !== "string") continue;
    if (!editId || editValue.length > 5000) continue;
    cleaned.push({ id: editId, value: editValue });
  }
  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: "No valid edits in request" },
      { status: 400 }
    );
  }

  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "GitHub Actions integration not configured (GITHUB_TOKEN missing)" },
      { status: 503 }
    );
  }

  try {
    const dispatch = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/ai-edit-text.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            pageId: id,
            edits: JSON.stringify(cleaned),
            requesterEmail: user.email || user.id,
          },
        }),
      }
    );

    if (!dispatch.ok) {
      const error = await dispatch.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: error.message ?? `Failed to dispatch edit workflow (${dispatch.status})`,
        },
        { status: 502 }
      );
    }

    await new Promise((r) => setTimeout(r, 1000));

    const runsResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/ai-edit-text.yml/runs?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    if (!runsResponse.ok) {
      return NextResponse.json({
        ok: true,
        queued: true,
        message: "Edit queued. Check workflow status in GitHub Actions.",
      });
    }

    const runsData = (await runsResponse.json()) as {
      workflow_runs?: Array<{ id: number; html_url: string }>;
    };
    const latestRun = runsData.workflow_runs?.[0];

    return NextResponse.json({
      ok: true,
      queued: true,
      runId: latestRun?.id,
      runUrl: latestRun?.html_url,
      editCount: cleaned.length,
      message: `${cleaned.length} edit${cleaned.length === 1 ? "" : "s"} queued.`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to queue edit",
      },
      { status: 502 }
    );
  }
}
