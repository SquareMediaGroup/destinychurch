/**
 * Validate AI-generated code by running TypeScript's compiler in noEmit mode.
 * If validation fails the calling code is responsible for rolling back the
 * written files (see git-automation.rollbackFiles).
 */
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ValidationResult {
  ok: boolean;
  output: string;
  durationMs: number;
}

export async function runTypeCheck(timeoutMs = 120_000): Promise<ValidationResult> {
  const started = Date.now();
  try {
    const { stdout, stderr } = await execAsync("npx tsc --noEmit", {
      cwd: process.cwd(),
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      ok: true,
      output: stdout || stderr || "",
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: (e.stdout || "") + (e.stderr || "") || e.message || "Type-check failed",
      durationMs: Date.now() - started,
    };
  }
}

/**
 * Returns true when the tsc output contains at least one error in any of the given files.
 * Used to distinguish failures caused by AI-written files from pre-existing repo errors.
 */
export function errorsTouchFiles(output: string, files: string[]): boolean {
  if (!output) return false;
  // tsc errors look like:  app/foo/page.tsx(12,4): error TS2322: ...
  const errorLines = output.split("\n").filter((l) => /error TS\d+/.test(l));
  return errorLines.some((line) => files.some((f) => line.includes(f)));
}

/**
 * Pull just the error lines (and a couple of context lines) for the given files
 * from a tsc --noEmit output. Caps to ~80 lines to keep prompts small.
 */
export function extractErrorsForFiles(output: string, files: string[], maxLines = 80): string {
  if (!output) return "";
  const all = output.split("\n");
  const kept: string[] = [];
  for (let i = 0; i < all.length; i++) {
    const line = all[i];
    if (files.some((f) => line.includes(f))) {
      kept.push(line);
    } else if (/error TS\d+/.test(line) && kept.length === 0) {
      // generic error not tied to our files — keep a few for context
      kept.push(line);
    }
    if (kept.length >= maxLines) break;
  }
  return kept.join("\n");
}
