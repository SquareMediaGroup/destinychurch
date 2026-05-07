import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generatePageFromIntent } from "@/lib/ai/page-orchestrator";
import { getLLMClient } from "@/lib/ai/llm-client";
import type { PageIntent } from "@/lib/ai/page-orchestrator";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Check authentication (assumes next-auth or similar)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = (await req.json()) as unknown;
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { pageType, context, audience, urgency } = body as Record<string, unknown>;

    // Validate required fields
    if (!pageType || !context) {
      return NextResponse.json(
        { error: "pageType and context are required" },
        { status: 400 }
      );
    }

    if (typeof pageType !== "string" || typeof context !== "string") {
      return NextResponse.json(
        { error: "pageType and context must be strings" },
        { status: 400 }
      );
    }

    // Rate limiting (basic: 1 request per 5 seconds per user)
    // In production, use Redis or similar
    // For now, we'll skip this as it requires state management

    // Create page intent
    const intent: PageIntent = {
      pageType,
      context,
      audience: typeof audience === "string" ? audience : undefined,
      urgency:
        urgency === "immediate" || urgency === "standard" ? urgency : "standard",
    };

    // Generate page structure
    const llmClient = getLLMClient();
    const generatedPage = await generatePageFromIntent(intent, llmClient);

    // Save draft page to database
    const { data: savedPage, error: dbError } = await supabase
      .from("builder_pages")
      .insert({
        slug: generatedPage.slug,
        title: generatedPage.title,
        layout_json: generatedPage.elements,
        status: "draft",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save page to database" },
        { status: 500 }
      );
    }

    // Return draft page with edit URL
    return NextResponse.json({
      id: savedPage.id,
      title: savedPage.title,
      slug: savedPage.slug,
      status: savedPage.status,
      elements: savedPage.layout_json,
      editUrl: `/admin/builder/${savedPage.id}`,
      reasoning: generatedPage.reasoning,
    });
  } catch (error) {
    console.error("Generate page error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
