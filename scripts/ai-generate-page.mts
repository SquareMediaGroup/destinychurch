/**
 * Script for GitHub Actions workflow: generates a page, commits, pushes, and emails audit.
 * Called from .github/workflows/ai-generate-page.yml
 *
 * Environment variables (set by workflow):
 *   GEN_CONTEXT, GEN_PAGE_TYPE, GEN_AUDIENCE, GEN_MEDIA, GEN_REQUESTER_EMAIL
 */
import { generatePageCode, repairGeneratedCode, type GeneratedCode } from "../lib/ai/code-generator";
import { VercelAIGatewayClient } from "../lib/ai/llm-client";
import { writePageFile, writeComponentFile } from "../lib/ai/code-context";
import {
  runTypeCheck,
  errorsTouchFiles,
  extractErrorsForFiles,
  type ValidationResult,
} from "../lib/ai/code-validator";
import { commitAndPush, rollbackFiles } from "../lib/ai/git-automation";
import { sendPageAuditEmail } from "../lib/ai/page-audit-email";

const MAX_TYPECHECK_ATTEMPTS = 3; // 1 initial + 2 repair attempts

async function writeFiles(generated: GeneratedCode): Promise<string[]> {
  const written: string[] = [];
  for (const c of generated.newComponents) {
    const [, category, fileName] = c.path.split("/");
    const componentName = fileName.replace(/\.tsx$/, "");
    const rel = await writeComponentFile(category, componentName, c.source);
    written.push(rel);
    console.log(`  - ${rel}`);
  }
  const pageRel = await writePageFile(generated.slug, generated.pageFile.source);
  written.push(pageRel);
  console.log(`  - ${pageRel}`);
  return written;
}

async function main() {
  const context = process.env.GEN_CONTEXT;
  const pageType = process.env.GEN_PAGE_TYPE || undefined;
  const audience = process.env.GEN_AUDIENCE || undefined;
  const requestedSlug = process.env.GEN_SLUG?.trim() || undefined;
  let media = undefined;

  if (process.env.GEN_MEDIA && process.env.GEN_MEDIA.trim()) {
    try {
      media = JSON.parse(process.env.GEN_MEDIA);
    } catch (err) {
      console.error("❌ GEN_MEDIA is not valid JSON");
      console.error("Received:", process.env.GEN_MEDIA.slice(0, 200));
      throw new Error("Invalid media JSON");
    }
  }

  const requesterEmail = process.env.GEN_REQUESTER_EMAIL;

  if (!context) {
    throw new Error("GEN_CONTEXT is required");
  }
  if (!requesterEmail) {
    throw new Error("GEN_REQUESTER_EMAIL is required");
  }

  console.log("📝 Generating page...");
  if (!process.env.VERCEL_AI_GATEWAY_TOKEN) {
    throw new Error("VERCEL_AI_GATEWAY_TOKEN is required but not set");
  }
  const llm = new VercelAIGatewayClient(process.env.VERCEL_AI_GATEWAY_TOKEN);

  let generated: GeneratedCode;
  try {
    generated = await generatePageCode({ context, pageType, audience, media, requestedSlug }, llm);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("LLM generation failed:", errorMsg);
    throw err;
  }
  console.log(`✓ Generated: ${generated.title}`);

  // Write files, type-check, and on failure ask the LLM to repair — up to MAX_TYPECHECK_ATTEMPTS.
  let writtenPaths: string[] = [];
  let validation: ValidationResult | null = null;
  let attempt = 0;

  while (attempt < MAX_TYPECHECK_ATTEMPTS) {
    attempt++;
    console.log(`\n📝 Writing files (attempt ${attempt}/${MAX_TYPECHECK_ATTEMPTS})...`);

    // Roll back any files from a previous failed attempt before writing the new version.
    if (writtenPaths.length > 0) {
      await rollbackFiles(writtenPaths);
      writtenPaths = [];
    }

    writtenPaths = await writeFiles(generated);

    console.log("🔍 Type-checking...");
    validation = await runTypeCheck();
    if (validation.ok) {
      console.log(`✓ Type-check passed (${validation.durationMs}ms)`);
      break;
    }

    // tsc failed. Decide whether the failure is in OUR files or pre-existing.
    const ourFiles = [generated.pageFile.path, ...generated.newComponents.map((c) => c.path)];
    const ourErrors = errorsTouchFiles(validation.output, ourFiles);

    if (!ourErrors) {
      console.warn(
        "⚠ Type-check failed, but no errors mention the AI-generated files. Treating as pre-existing repo issue and continuing."
      );
      console.warn("   First 600 chars of output:\n", validation.output.slice(0, 600));
      validation = { ...validation, ok: true };
      break;
    }

    if (attempt >= MAX_TYPECHECK_ATTEMPTS) {
      console.error("❌ Type-check still failing after max repair attempts.");
      console.error(extractErrorsForFiles(validation.output, ourFiles));
      break;
    }

    console.warn(`⚠ Type-check failed (attempt ${attempt}). Asking LLM to repair...`);
    const errorSummary = extractErrorsForFiles(validation.output, ourFiles);
    console.warn("Errors to repair:\n" + errorSummary);

    try {
      generated = await repairGeneratedCode(generated, validation.output, llm);
      console.log(`✓ Repair candidate received: ${generated.title}`);
    } catch (err) {
      console.error("Repair LLM call failed:", err instanceof Error ? err.message : err);
      break;
    }
  }

  if (!validation || !validation.ok) {
    // Roll back so we don't leave broken code on disk; the workflow will fail next.
    await rollbackFiles(writtenPaths);
    // Send a failure audit email so the volunteer knows what happened
    try {
      await sendPageAuditEmail({
        title: generated.title,
        slug: generated.slug,
        requester: requesterEmail,
        reasoning: generated.reasoning,
        files: writtenPaths,
        validation: validation ?? {
          ok: false,
          output: "Type-check did not run.",
          durationMs: 0,
        },
        pushed: false,
      });
    } catch (emailErr) {
      console.error("Failed to send failure audit email:", emailErr);
    }
    throw new Error("TypeScript validation failed after repair attempts");
  }

  console.log("📤 Committing and pushing...");
  const commitResult = await commitAndPush({
    paths: writtenPaths,
    message: `feat: AI-generated page /${generated.slug}\n\n${generated.title}\n\nRequested by: ${requesterEmail}\nReasoning: ${generated.reasoning.slice(0, 400)}`,
    push: true,
  });
  if (!commitResult.ok) {
    throw new Error(`Commit failed: ${commitResult.output}`);
  }
  console.log(`✓ Pushed: ${commitResult.hash?.slice(0, 12)}`);

  console.log("📧 Sending audit email...");
  await sendPageAuditEmail({
    title: generated.title,
    slug: generated.slug,
    requester: requesterEmail,
    reasoning: generated.reasoning,
    files: writtenPaths,
    commitHash: commitResult.hash,
    validation,
    pushed: true,
  });
  console.log("✓ Audit email sent");

  console.log(`\n✅ Done: /${generated.slug}`);
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
