/**
 * Git automation for AI-generated pages.
 * Adds files, commits with a clear message, and pushes to main.
 *
 * In production (Vercel) the filesystem is read-only — this is intended to
 * run in environments where the working tree is writable (local dev, a
 * dedicated worker, or CI). The API route should detect VERCEL=1 and skip.
 */
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface CommitResult {
  ok: boolean;
  hash?: string;
  output: string;
}

export async function rollbackFiles(paths: string[]): Promise<void> {
  for (const p of paths) {
    const abs = path.resolve(process.cwd(), p);
    try {
      await fs.rm(abs, { force: true });
    } catch {
      // ignore
    }
  }
  // Best-effort: also remove now-empty page directories
  for (const p of paths) {
    if (p.startsWith("app/") && p.endsWith("/page.tsx")) {
      const dir = path.dirname(path.resolve(process.cwd(), p));
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) await fs.rmdir(dir);
      } catch {
        // ignore
      }
    }
  }
}

async function run(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return execAsync(cmd, { cwd: process.cwd(), maxBuffer: 5 * 1024 * 1024 });
}

export async function commitAndPush(opts: {
  paths: string[];
  message: string;
  push?: boolean;
}): Promise<CommitResult> {
  if (opts.paths.length === 0) {
    return { ok: false, output: "No paths to commit" };
  }

  try {
    const escaped = opts.paths.map((p) => `"${p.replace(/"/g, '\\"')}"`).join(" ");
    await run(`git add ${escaped}`);

    // Sanity check: anything actually staged?
    const { stdout: staged } = await run("git diff --cached --name-only");
    if (!staged.trim()) {
      return { ok: false, output: "Nothing staged after git add (files unchanged?)" };
    }

    const safeMsg = opts.message.replace(/"/g, '\\"');
    await run(`git commit -m "${safeMsg}"`);

    const { stdout: hashOut } = await run("git rev-parse HEAD");
    const hash = hashOut.trim();

    if (opts.push !== false) {
      await run("git push origin HEAD:main");
    }

    return { ok: true, hash, output: `Committed ${opts.paths.length} file(s) as ${hash}` };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      output: (e.stdout || "") + (e.stderr || "") || e.message || "git failed",
    };
  }
}
