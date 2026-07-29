#!/usr/bin/env node
// Regenerate REPOSITORY_DOCUMENTATION.pdf from REPOSITORY_DOCUMENTATION.md
// via a headless-Chromium print-to-PDF (matching how the committed PDF was produced).
//
// Pipeline: Markdown -> HTML (python `markdown` w/ tables + fenced code) -> PDF (Chromium).
// Usage: node scripts/generate-docs-pdf.mjs
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MD = "REPOSITORY_DOCUMENTATION.md";
const PDF = "REPOSITORY_DOCUMENTATION.pdf";

// Locate a Chromium binary (pre-installed in the web/CI environment).
function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/opt/pw-browsers/chromium",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  // Fall back to a glob under the Playwright browsers dir.
  try {
    const out = execFileSync("bash", [
      "-lc",
      "ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1",
    ]).toString().trim();
    if (out && existsSync(out)) return out;
  } catch {}
  throw new Error("No Chromium binary found");
}

// Markdown -> HTML fragment via python's markdown lib.
const htmlBody = execFileSync("python3", [
  "-c",
  `import sys, markdown
src = open("${MD}", encoding="utf-8").read()
print(markdown.markdown(src, extensions=["tables","fenced_code","toc","sane_lists","attr_list"]))`,
]).toString();

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         font-size: 10.5pt; line-height: 1.55; color: #1a2230; margin: 0; }
  h1, h2, h3, h4 { color: #0f1826; line-height: 1.25; font-weight: 700;
                   page-break-after: avoid; }
  h1 { font-size: 22pt; border-bottom: 3px solid #d81f4a; padding-bottom: 8px; margin: 0 0 18px; }
  h2 { font-size: 16pt; border-bottom: 1px solid #e2e6ee; padding-bottom: 5px;
       margin: 26px 0 12px; }
  h3 { font-size: 12.5pt; margin: 20px 0 8px; }
  h4 { font-size: 11pt; margin: 16px 0 6px; }
  p { margin: 8px 0; }
  a { color: #d81f4a; text-decoration: none; }
  code { font-family: "SF Mono", "Cascadia Code", Consolas, monospace; font-size: 9pt;
         background: #f3f4f8; padding: 1px 5px; border-radius: 4px; color: #b5164a; }
  pre { background: #10192b; color: #e7ecf5; padding: 12px 14px; border-radius: 8px;
        overflow-x: auto; page-break-inside: avoid; font-size: 8.7pt; line-height: 1.45; }
  pre code { background: none; color: inherit; padding: 0; font-size: inherit; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 9.3pt;
          page-break-inside: avoid; }
  th, td { border: 1px solid #dfe3ec; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f5f6fa; font-weight: 700; }
  tr:nth-child(even) td { background: #fafbfd; }
  ul, ol { margin: 8px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  hr { border: none; border-top: 1px solid #e2e6ee; margin: 22px 0; }
  blockquote { border-left: 3px solid #d81f4a; margin: 12px 0; padding: 2px 14px;
               color: #46506180; background: #fbfbfd; }
  strong { color: #0f1826; }
</style></head>
<body>${htmlBody}</body></html>`;

const tmpHtml = join(tmpdir(), "repo-docs.html");
writeFileSync(tmpHtml, html, "utf-8");

const chromium = findChromium();
execFileSync(chromium, [
  "--headless",
  "--no-sandbox",
  "--disable-gpu",
  "--no-pdf-header-footer",
  `--print-to-pdf=${PDF}`,
  `file://${tmpHtml}`,
], { stdio: "inherit" });

rmSync(tmpHtml, { force: true });
console.log(`✅ Regenerated ${PDF} from ${MD}`);
