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
import { upsertCodePage } from "../lib/ai/builder-pages-db";
import {
  parseLayoutParam,
  type Skeleton,
  ALL_BLOCK_KINDS,
} from "../lib/ai/skeleton-types";

const MAX_TYPECHECK_ATTEMPTS = 4; // 1 initial + 3 repair attempts

type Phase =
  | "init"
  | "parse-inputs"
  | "llm-generate"
  | "write-files"
  | "typecheck"
  | "typecheck-repair"
  | "commit-push"
  | "db-register"
  | "audit-email"
  | "done";

/**
 * Mutable state we want the top-level catch to see when emitting a failure email.
 * Set fields as we make progress so any crash carries useful context.
 */
interface RunState {
  phase: Phase;
  requesterEmail: string;
  title: string;
  slug: string;
  reasoning: string;
  writtenPaths: string[];
  lastValidation: ValidationResult | null;
  failureEmailSent: boolean;
}

const state: RunState = {
  phase: "init",
  requesterEmail: "",
  title: "",
  slug: "",
  reasoning: "",
  writtenPaths: [],
  lastValidation: null,
  failureEmailSent: false,
};

function phaseBanner(p: Phase, label: string): void {
  state.phase = p;
  console.log(`\n[phase:${p}] ${label}`);
}

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

async function emitFailureEmail(err: unknown): Promise<void> {
  if (state.failureEmailSent) return;
  if (!state.requesterEmail) {
    console.warn("⚠ No requester email captured yet — skipping failure audit email.");
    return;
  }
  const errMsg = err instanceof Error ? `${err.message}\n\n${err.stack ?? ""}` : String(err);
  const validationOutput = state.lastValidation
    ? state.lastValidation.output
    : `Failed in phase: ${state.phase}\n\n${errMsg}`;
  try {
    await sendPageAuditEmail({
      title: state.title || "AI page generation failed",
      slug: state.slug || "(no slug)",
      requester: state.requesterEmail,
      reasoning: state.reasoning || `Failed in phase: ${state.phase}`,
      files: state.writtenPaths,
      validation: {
        ok: false,
        output: `Phase: ${state.phase}\n\n${validationOutput}`,
        durationMs: state.lastValidation?.durationMs ?? 0,
      },
      pushed: false,
    });
    state.failureEmailSent = true;
    console.log("📧 Sent failure audit email.");
  } catch (emailErr) {
    console.error("⚠ Failed to send failure audit email:", emailErr);
  }
}

async function main() {
  phaseBanner("parse-inputs", "Parsing workflow inputs…");

  const context = process.env.GEN_CONTEXT;
  const pageType = process.env.GEN_PAGE_TYPE || undefined;
  const audience = process.env.GEN_AUDIENCE || undefined;
  const requestedSlug = process.env.GEN_SLUG?.trim() || undefined;
  state.requesterEmail = process.env.GEN_REQUESTER_EMAIL || "";

  let media = undefined;
  if (process.env.GEN_MEDIA && process.env.GEN_MEDIA.trim()) {
    try {
      media = JSON.parse(process.env.GEN_MEDIA);
    } catch (err) {
      console.error("❌ GEN_MEDIA is not valid JSON");
      console.error("Received:", process.env.GEN_MEDIA.slice(0, 200));
      throw new Error(`Invalid media JSON: ${err instanceof Error ? err.message : err}`);
    }
  }

  const layout = parseLayoutParam(process.env.GEN_LAYOUT);
  if (layout.length > 0) {
    console.log(`📐 Skeleton layout received: ${layout.join(" → ")}`);
  }

  // Optional full skeleton with per-block config. Validated lightly here so the
  // generator can rely on `block.kind` being a real BlockKind.
  let skeleton: Skeleton | undefined;
  if (process.env.GEN_SKELETON && process.env.GEN_SKELETON.trim()) {
    try {
      const parsed = JSON.parse(process.env.GEN_SKELETON);
      if (
        parsed &&
        Array.isArray(parsed.blocks) &&
        parsed.blocks.every(
          (b: unknown) =>
            typeof b === "object" &&
            b !== null &&
            (ALL_BLOCK_KINDS as string[]).includes((b as { kind?: string }).kind ?? "")
        )
      ) {
        skeleton = parsed;
        const configured = parsed.blocks.filter(
          (b: { data?: Record<string, unknown> }) =>
            b.data && Object.values(b.data).some((v) => typeof v === "string" && v.trim().length > 0)
        ).length;
        console.log(
          `📋 Skeleton config: ${parsed.blocks.length} block(s), ${configured} with volunteer-provided content`
        );
      } else {
        console.warn("⚠ GEN_SKELETON parsed but failed shape validation — ignoring");
      }
    } catch (err) {
      console.warn("⚠ GEN_SKELETON is not valid JSON — ignoring:", err);
    }
  }

  if (!context) {
    throw new Error("GEN_CONTEXT is required");
  }
  if (!state.requesterEmail) {
    throw new Error("GEN_REQUESTER_EMAIL is required");
  }
  if (!process.env.VERCEL_AI_GATEWAY_TOKEN) {
    throw new Error("VERCEL_AI_GATEWAY_TOKEN is required but not set");
  }

  phaseBanner("llm-generate", "Calling LLM…");
  const llm = new VercelAIGatewayClient(process.env.VERCEL_AI_GATEWAY_TOKEN);

  let generated: GeneratedCode;
  try {
    generated = await generatePageCode(
      {
        context,
        pageType,
        audience,
        media,
        requestedSlug,
        layout: layout.length > 0 ? layout : undefined,
        skeleton,
      },
      llm
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`LLM generation failed: ${errorMsg}`);
  }
  state.title = generated.title;
  state.slug = generated.slug;
  state.reasoning = generated.reasoning;
  console.log(`✓ Generated: ${generated.title}`);

  // Write files, type-check, and on failure ask the LLM to repair — up to MAX_TYPECHECK_ATTEMPTS.
  let validation: ValidationResult | null = null;
  let attempt = 0;

  while (attempt < MAX_TYPECHECK_ATTEMPTS) {
    attempt++;
    phaseBanner(
      attempt === 1 ? "write-files" : "typecheck-repair",
      `Writing files (attempt ${attempt}/${MAX_TYPECHECK_ATTEMPTS})…`,
    );

    // Roll back any files from a previous failed attempt before writing the new version.
    if (state.writtenPaths.length > 0) {
      await rollbackFiles(state.writtenPaths);
      state.writtenPaths = [];
    }

    state.writtenPaths = await writeFiles(generated);

    phaseBanner("typecheck", "Type-checking…");
    validation = await runTypeCheck();
    state.lastValidation = validation;
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
      state.lastValidation = validation;
      break;
    }

    if (attempt >= MAX_TYPECHECK_ATTEMPTS) {
      console.error("❌ Type-check still failing after max repair attempts.");
      console.error(extractErrorsForFiles(validation.output, ourFiles));
      break;
    }

    console.warn(`⚠ Type-check failed (attempt ${attempt}). Asking LLM to repair…`);
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
    // Roll back so we don't leave broken code on disk.
    await rollbackFiles(state.writtenPaths);
    // Failure email is emitted by the outer catch via emitFailureEmail.
    throw new Error("TypeScript validation failed after repair attempts");
  }

  phaseBanner("commit-push", "Committing and pushing…");
  const commitResult = await commitAndPush({
    paths: state.writtenPaths,
    message: `feat: AI-generated page /${generated.slug}\n\n${generated.title}\n\nRequested by: ${state.requesterEmail}\nReasoning: ${generated.reasoning.slice(0, 400)}`,
    push: true,
  });
  if (!commitResult.ok) {
    throw new Error(`Commit failed: ${commitResult.output}`);
  }
  console.log(`✓ Pushed: ${commitResult.hash?.slice(0, 12)}`);

  phaseBanner("db-register", "Registering page in /admin/builder dashboard…");
  try {
    const upsert = await upsertCodePage({
      slug: generated.slug,
      title: generated.title,
      source_type: "code",
      source_path: generated.pageFile.path,
      editable_texts: generated.editableTexts,
      repo_commit: commitResult.hash ?? null,
      status: "published",
    });
    console.log(`✓ Registered as builder_pages.id = ${upsert.id} (${generated.editableTexts.length} editable texts)`);
  } catch (err) {
    // Page is live; DB registration is best-effort. Log loudly but don't fail the run.
    console.error("⚠ Failed to register page in builder_pages — page is live but won't show in /admin/builder:", err);
  }

  phaseBanner("audit-email", "Sending audit email…");
  await sendPageAuditEmail({
    title: generated.title,
    slug: generated.slug,
    requester: state.requesterEmail,
    reasoning: generated.reasoning,
    files: state.writtenPaths,
    commitHash: commitResult.hash,
    validation,
    pushed: true,
  });
  console.log("✓ Audit email sent");

  phaseBanner("done", `✅ Done: /${generated.slug}`);
}

// Surface async errors that would otherwise exit silently.
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection in phase:", state.phase);
  console.error(reason instanceof Error ? reason.stack ?? reason.message : reason);
  void emitFailureEmail(reason).finally(() => process.exit(1));
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception in phase:", state.phase);
  console.error(err.stack ?? err.message);
  void emitFailureEmail(err).finally(() => process.exit(1));
});

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(`\n❌ Failure in phase: ${state.phase}`);
    if (err instanceof Error) {
      console.error(`Message: ${err.message}`);
      if (err.stack) console.error(`Stack:\n${err.stack}`);
      const cause = (err as Error & { cause?: unknown }).cause;
      if (cause) console.error("Cause:", cause);
    } else {
      console.error("Non-Error thrown:", err);
    }
    await emitFailureEmail(err);
    process.exit(1);
  });
