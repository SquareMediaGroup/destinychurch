/**
 * Apply visual-editor text edits to AI-generated source files.
 *
 * Inputs (env):
 *   EDIT_PAGE_ID         — builder_pages.id
 *   EDIT_EDITS_JSON      — JSON array of { id, value }
 *   EDIT_REQUESTER_EMAIL — for audit / commit message
 */
import { promises as fs } from "fs";
import path from "path";
import {
  loadCodePage,
  updateEditableTexts,
} from "../lib/ai/builder-pages-db";
import type { EditableText } from "../lib/ai/code-generator";
import { runTypeCheck } from "../lib/ai/code-validator";
import { commitAndPush } from "../lib/ai/git-automation";

interface EditInput {
  id: string;
  value: string;
}

interface AppliedEdit {
  id: string;
  file: string;
  oldValue: string;
  newValue: string;
}

/**
 * Replace `oldValue` with `newValue` inside `source`. To disambiguate when the
 * same string appears multiple times, prefer the location indicated by `context`
 * (a snippet from the catalog that contains oldValue exactly once). Returns the
 * new source, or null if no safe replacement could be made.
 */
function safeReplace(
  source: string,
  oldValue: string,
  newValue: string,
  context: string
): string | null {
  if (oldValue === newValue) return source;
  if (!oldValue) return null;

  // Strategy 1: if oldValue appears exactly once, do a direct replace.
  const occurrences = source.split(oldValue).length - 1;
  if (occurrences === 0) {
    return null; // can't find — caller will report
  }
  if (occurrences === 1) {
    return source.replace(oldValue, newValue);
  }

  // Strategy 2: use context to locate the right occurrence.
  if (context) {
    const ctxIdx = source.indexOf(context);
    if (ctxIdx !== -1 && context.includes(oldValue)) {
      // Replace inside the context, then splice back into the source.
      const newContext = context.replace(oldValue, newValue);
      return (
        source.slice(0, ctxIdx) +
        newContext +
        source.slice(ctxIdx + context.length)
      );
    }
  }

  // Strategy 3: ambiguous — refuse rather than corrupt unrelated copy.
  return null;
}

async function applyEditsToFile(
  file: string,
  edits: Array<{ entry: EditableText; newValue: string }>
): Promise<{ applied: AppliedEdit[]; failed: string[]; touched: boolean }> {
  const abs = path.resolve(process.cwd(), file);
  let source = await fs.readFile(abs, "utf-8");
  const applied: AppliedEdit[] = [];
  const failed: string[] = [];

  for (const { entry, newValue } of edits) {
    const next = safeReplace(source, entry.value, newValue, entry.context);
    if (next === null) {
      failed.push(`${entry.id} (${entry.label}): could not locate "${entry.value.slice(0, 60)}…" unambiguously in ${file}`);
      continue;
    }
    if (next !== source) {
      source = next;
      applied.push({
        id: entry.id,
        file,
        oldValue: entry.value,
        newValue,
      });
    }
  }

  if (applied.length > 0) {
    await fs.writeFile(abs, source, "utf-8");
  }
  return { applied, failed, touched: applied.length > 0 };
}

async function main() {
  const pageId = process.env.EDIT_PAGE_ID;
  const editsJson = process.env.EDIT_EDITS_JSON;
  const requesterEmail = process.env.EDIT_REQUESTER_EMAIL;

  if (!pageId) throw new Error("EDIT_PAGE_ID is required");
  if (!editsJson) throw new Error("EDIT_EDITS_JSON is required");
  if (!requesterEmail) throw new Error("EDIT_REQUESTER_EMAIL is required");

  let editsInput: EditInput[];
  try {
    editsInput = JSON.parse(editsJson);
  } catch {
    throw new Error("EDIT_EDITS_JSON is not valid JSON");
  }
  if (!Array.isArray(editsInput) || editsInput.length === 0) {
    throw new Error("EDIT_EDITS_JSON must be a non-empty array");
  }

  console.log(`📝 Loading page ${pageId} from builder_pages…`);
  const page = await loadCodePage(pageId);
  console.log(`✓ Loaded ${page.title} (/${page.slug}) with ${page.editable_texts.length} editable texts`);

  // Pair each edit with its catalog entry, group by file
  const byFile = new Map<string, Array<{ entry: EditableText; newValue: string }>>();
  for (const edit of editsInput) {
    const entry = page.editable_texts.find((t) => t.id === edit.id);
    if (!entry) {
      console.warn(`⚠ Skipping unknown edit id "${edit.id}"`);
      continue;
    }
    if (entry.value === edit.value) continue; // no change
    if (!byFile.has(entry.file)) byFile.set(entry.file, []);
    byFile.get(entry.file)!.push({ entry, newValue: edit.value });
  }

  if (byFile.size === 0) {
    console.log("ℹ No effective edits — nothing changed.");
    return;
  }

  console.log(`✏ Applying edits across ${byFile.size} file(s)…`);
  const allApplied: AppliedEdit[] = [];
  const allFailed: string[] = [];
  const touchedFiles: string[] = [];

  for (const [file, edits] of byFile) {
    console.log(`  ${file}: ${edits.length} edit(s)`);
    const { applied, failed, touched } = await applyEditsToFile(file, edits);
    allApplied.push(...applied);
    allFailed.push(...failed);
    if (touched) touchedFiles.push(file);
  }

  if (allFailed.length > 0) {
    console.error(`❌ ${allFailed.length} edit(s) could not be applied:`);
    for (const msg of allFailed) console.error(`  - ${msg}`);
  }

  if (touchedFiles.length === 0) {
    throw new Error("No files were modified — nothing to commit");
  }

  console.log("🔍 Type-checking after edits…");
  const validation = await runTypeCheck();
  if (!validation.ok) {
    // Don't push broken code. Restore from git so disk matches main.
    console.error("Type-check failed; reverting edits.");
    console.error(validation.output.slice(0, 2000));
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    for (const f of touchedFiles) {
      await execAsync(`git checkout -- "${f}"`).catch(() => {});
    }
    throw new Error("TypeScript validation failed after edits — changes reverted");
  }
  console.log(`✓ Type-check passed (${validation.durationMs}ms)`);

  console.log("📤 Committing and pushing…");
  const summary =
    allApplied.length === 1
      ? `1 text edit on /${page.slug}`
      : `${allApplied.length} text edits on /${page.slug}`;
  const commit = await commitAndPush({
    paths: touchedFiles,
    message: `edit: ${summary}\n\nRequested by: ${requesterEmail}\n\n${allApplied
      .map((a) => `- ${a.id}: "${a.oldValue.slice(0, 40)}…" → "${a.newValue.slice(0, 40)}…"`)
      .join("\n")}`,
    push: true,
  });
  if (!commit.ok) {
    throw new Error(`Commit failed: ${commit.output}`);
  }
  console.log(`✓ Pushed ${commit.hash?.slice(0, 12)}`);

  // Update DB catalog so subsequent edits reflect the new values
  const newCatalog = page.editable_texts.map((t) => {
    const applied = allApplied.find((a) => a.id === t.id);
    if (applied) {
      // Also need to update the context snippet — replace oldValue inside it
      const newContext = t.context.includes(applied.oldValue)
        ? t.context.replace(applied.oldValue, applied.newValue)
        : t.context;
      return { ...t, value: applied.newValue, context: newContext };
    }
    return t;
  });
  await updateEditableTexts(pageId, newCatalog, commit.hash ?? "");
  console.log("✓ Updated builder_pages.editable_texts catalog");

  console.log(`\n✅ Done: ${allApplied.length} edit(s) applied to /${page.slug}`);
  if (allFailed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
