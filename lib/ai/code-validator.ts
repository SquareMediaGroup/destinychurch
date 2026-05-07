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

export async function runTypeCheck(timeoutMs = 60_000): Promise<ValidationResult> {
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
