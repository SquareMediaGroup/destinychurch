import { NextRequest, NextResponse } from "next/server";
import { suggestSectionForPage } from "@/lib/ai/page-orchestrator";
import { getLLMClient } from "@/lib/ai/llm-client";
import type { BuilderElement } from "@/lib/builder/types";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = (await req.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { pageType, currentElements, context } = body as Record<string, unknown>;

    // Validate required fields
    if (!pageType || !context) {
      return NextResponse.json(
        { error: "pageType and context are required" },
        { status: 400 }
      );
    }

    if (
      typeof pageType !== "string" ||
      typeof context !== "string" ||
      !Array.isArray(currentElements)
    ) {
      return NextResponse.json(
        { error: "Invalid field types" },
        { status: 400 }
      );
    }

    // Suggest section
    const llmClient = getLLMClient();
    const suggestedElement = await suggestSectionForPage(
      {
        pageType,
        currentElements: currentElements as BuilderElement[],
        description: context,
      },
      llmClient
    );

    // Return suggested element
    return NextResponse.json({
      suggestedElement,
      message: "Suggested section based on page context",
    });
  } catch (error) {
    console.error("Suggest section error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
