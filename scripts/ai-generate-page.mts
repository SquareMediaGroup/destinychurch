/**
 * Script for GitHub Actions workflow: generates a page, commits, pushes, and emails audit.
 * Called from .github/workflows/ai-generate-page.yml
 *
 * Environment variables (set by workflow):
 *   GEN_CONTEXT, GEN_PAGE_TYPE, GEN_AUDIENCE, GEN_MEDIA, GEN_REQUESTER_EMAIL
 */
import { generatePageCode } from "../lib/ai/code-generator";
import { VercelAIGatewayClient } from "../lib/ai/llm-client";
import { writePageFile, writeComponentFile } from "../lib/ai/code-context";
import { runTypeCheck } from "../lib/ai/code-validator";
import { commitAndPush } from "../lib/ai/git-automation";
import { sendPageAuditEmail } from "../lib/ai/page-audit-email";

async function main() {
  const context = process.env.GEN_CONTEXT;
  const pageType = process.env.GEN_PAGE_TYPE || undefined;
  const audience = process.env.GEN_AUDIENCE || undefined;
  const media = process.env.GEN_MEDIA ? JSON.parse(process.env.GEN_MEDIA) : undefined;
  const requesterEmail = process.env.GEN_REQUESTER_EMAIL;

  if (!context) {
    throw new Error("GEN_CONTEXT is required");
  }
  if (!requesterEmail) {
    throw new Error("GEN_REQUESTER_EMAIL is required");
  }

  console.log("📝 Generating page...");
  const llm = new VercelAIGatewayClient(process.env.VERCEL_AI_GATEWAY_TOKEN!);
  const generated = await generatePageCode({ context, pageType, audience, media }, llm);
  console.log(`✓ Generated: ${generated.title}`);

  console.log("📝 Writing files...");
  const writtenPaths: string[] = [];
  for (const c of generated.newComponents) {
    const [, category, fileName] = c.path.split("/");
    const componentName = fileName.replace(/\.tsx$/, "");
    const rel = await writeComponentFile(category, componentName, c.source);
    writtenPaths.push(rel);
    console.log(`  - ${rel}`);
  }
  const pageRel = await writePageFile(generated.slug, generated.pageFile.source);
  writtenPaths.push(pageRel);
  console.log(`  - ${pageRel}`);

  console.log("🔍 Type-checking...");
  const validation = await runTypeCheck();
  if (!validation.ok) {
    console.error("Type-check failed:\n", validation.output);
    throw new Error("TypeScript validation failed");
  }
  console.log(`✓ Type-check passed (${validation.durationMs}ms)`);

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
