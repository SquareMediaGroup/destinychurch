import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const GITHUB_TOKEN = process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "SquareMediaGroup/destinychurch";

export const runtime = "nodejs";

/**
 * Dispatch the AI page generation workflow via GitHub Actions.
 * The workflow runs in a VM with a writable filesystem, generates the page,
 * type-checks, commits, pushes, and sends an audit email.
 */
export async function POST(req: NextRequest) {
  // Identify the user via Supabase cookies (middleware already enforces auth)
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { pageType, context, audience, media, slug } = body as Record<string, unknown>;
  if (typeof context !== "string" || !context.trim()) {
    return NextResponse.json({ error: "context is required" }, { status: 400 });
  }

  // Reject reserved system routes (admin, api, auth, etc.) to prevent accidental
  // overwrite of critical app infrastructure. Defence in depth — generator also blocks.
  const RESERVED = [
    "admin", "api", "auth", "_next", "favicon.ico", "robots", "sitemap",
    "layout", "page", "globals", "not-found",
  ];
  if (typeof slug === "string" && slug.trim()) {
    const normalized = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    if (RESERVED.includes(normalized)) {
      return NextResponse.json(
        { error: `Slug "${normalized}" is a reserved system route and cannot be used.` },
        { status: 400 }
      );
    }
  }

  // Validate GitHub token
  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "GitHub Actions integration not configured (GITHUB_TOKEN missing)" },
      { status: 503 }
    );
  }

  // Dispatch the workflow
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/ai-generate-page.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            context: context.trim(),
            pageType: typeof pageType === "string" && pageType.trim() ? pageType.trim() : "",
            audience: typeof audience === "string" && audience.trim() ? audience.trim() : "",
            slug: typeof slug === "string" && slug.trim()
              ? slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
              : "",
            media: Array.isArray(media) ? JSON.stringify(media) : "",
            requesterEmail: user.email || user.id,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("GitHub API error:", error);
      return NextResponse.json(
        {
          error:
            error.message ||
            `Failed to dispatch workflow (${response.status})`,
        },
        { status: 502 }
      );
    }

    // GitHub returns 204 No Content on success, so we need to fetch the run
    // Wait a bit for the workflow to appear
    await new Promise((r) => setTimeout(r, 1000));

    // Get the latest run for this workflow
    const runsResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/ai-generate-page.yml/runs?per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    if (!runsResponse.ok) {
      console.error("Failed to fetch workflow run");
      return NextResponse.json(
        {
          ok: true,
          queued: true,
          message: "Page generation queued on GitHub Actions. Check workflow status in the Actions tab.",
        }
      );
    }

    const runsData = (await runsResponse.json()) as {
      workflow_runs?: Array<{ id: number; html_url: string; status: string }>;
    };
    const latestRun = runsData.workflow_runs?.[0];

    return NextResponse.json({
      ok: true,
      queued: true,
      runId: latestRun?.id,
      runUrl: latestRun?.html_url,
      message: "Page generation queued. Workflow is running now.",
    });
  } catch (err) {
    console.error("Dispatch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to queue page generation" },
      { status: 502 }
    );
  }
}
