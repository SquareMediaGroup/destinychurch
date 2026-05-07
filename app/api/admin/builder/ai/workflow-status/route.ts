import { NextRequest, NextResponse } from "next/server";
import { getWorkflowStatus } from "@/lib/github-actions";

const GITHUB_TOKEN = process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || "SquareMediaGroup/destinychurch";

export const runtime = "nodejs";

/**
 * Poll the status of a GitHub Actions workflow run.
 * Called by the frontend to show progress.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId");

  if (!runId || !/^\d+$/.test(runId)) {
    return NextResponse.json({ error: "Invalid runId" }, { status: 400 });
  }

  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "GitHub token not configured" },
      { status: 503 }
    );
  }

  try {
    const status = await getWorkflowStatus(GITHUB_TOKEN, GITHUB_REPO, parseInt(runId, 10));
    return NextResponse.json({ status });
  } catch (err) {
    console.error("Workflow status error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch workflow status" },
      { status: 502 }
    );
  }
}
