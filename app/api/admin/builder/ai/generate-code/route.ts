import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getLLMClient } from "@/lib/ai/llm-client";
import { generatePageCode } from "@/lib/ai/code-generator";
import {
  pageDirExists,
  writePageFile,
  writeComponentFile,
  deletePageFile,
} from "@/lib/ai/code-context";
import { runTypeCheck } from "@/lib/ai/code-validator";
import { commitAndPush, rollbackFiles } from "@/lib/ai/git-automation";
import { sendPageAuditEmail } from "@/lib/ai/page-audit-email";

export const runtime = "nodejs";
export const maxDuration = 300; // generation + tsc + git can take a while

export async function POST(req: NextRequest) {
  // Block on Vercel — filesystem is read-only there
  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        error:
          "AI code generation is only available in environments with a writable filesystem (run locally, or on a dedicated worker). It is disabled on Vercel.",
      },
      { status: 503 }
    );
  }

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

  const { pageType, context, audience, media } = body as Record<string, unknown>;
  if (typeof context !== "string" || !context.trim()) {
    return NextResponse.json({ error: "context is required" }, { status: 400 });
  }

  // Generate code via LLM
  const llm = getLLMClient();
  let generated;
  try {
    generated = await generatePageCode(
      {
        context,
        pageType: typeof pageType === "string" && pageType.trim() ? pageType.trim() : undefined,
        audience: typeof audience === "string" ? audience : undefined,
        media: Array.isArray(media) ? (media as never[]) : undefined,
      },
      llm
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Code generation failed" },
      { status: 502 }
    );
  }

  // Slug must not collide with existing route
  if (await pageDirExists(generated.slug)) {
    return NextResponse.json(
      { error: `Route /${generated.slug} already exists. Choose a different page concept or rename.` },
      { status: 409 }
    );
  }

  // Write files
  const writtenPaths: string[] = [];
  try {
    for (const c of generated.newComponents) {
      const [, category, fileName] = c.path.split("/");
      const componentName = fileName.replace(/\.tsx$/, "");
      const rel = await writeComponentFile(category, componentName, c.source);
      writtenPaths.push(rel);
    }
    const pageRel = await writePageFile(generated.slug, generated.pageFile.source);
    writtenPaths.push(pageRel);
  } catch (err) {
    await rollbackFiles(writtenPaths);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to write files" },
      { status: 500 }
    );
  }

  // Validate
  const validation = await runTypeCheck();

  // If validation fails, roll back the page (keep components in case AI wants to retry?)
  if (!validation.ok) {
    await rollbackFiles(writtenPaths);
    await deletePageFile(generated.slug);

    // Audit failure email
    try {
      await sendPageAuditEmail({
        title: generated.title,
        slug: generated.slug,
        requester: user.email ?? user.id,
        reasoning: generated.reasoning,
        files: writtenPaths,
        validation,
        pushed: false,
      });
    } catch (err) {
      console.error("Audit email failed:", err);
    }

    return NextResponse.json(
      {
        error: "Generated code failed type-check. Files have been rolled back.",
        validation: validation.output.slice(0, 4000),
      },
      { status: 422 }
    );
  }

  // Commit + push
  const commitResult = await commitAndPush({
    paths: writtenPaths,
    message: `feat: AI-generated page /${generated.slug}\n\n${generated.title}\n\nRequested by: ${user.email ?? user.id}\nReasoning: ${generated.reasoning.slice(0, 400)}`,
    push: true,
  });

  // Audit email (always send on success, even if push failed)
  try {
    await sendPageAuditEmail({
      title: generated.title,
      slug: generated.slug,
      requester: user.email ?? user.id,
      reasoning: generated.reasoning,
      files: writtenPaths,
      commitHash: commitResult.hash,
      validation,
      pushed: commitResult.ok,
    });
  } catch (err) {
    console.error("Audit email failed:", err);
  }

  return NextResponse.json({
    ok: true,
    title: generated.title,
    slug: generated.slug,
    route: `/${generated.slug}`,
    files: writtenPaths,
    commit: commitResult.hash,
    pushed: commitResult.ok,
    pushOutput: commitResult.ok ? null : commitResult.output,
    reasoning: generated.reasoning,
  });
}
