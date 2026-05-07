/**
 * Code context builder for AI code generation.
 * Reads existing pages and components from the filesystem so the LLM can
 * model new pages on patterns it already sees in the repo.
 */
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");
const COMPONENTS_DIR = path.join(ROOT, "components");

export interface ComponentInfo {
  importPath: string; // e.g. "@/components/home/HeroSection"
  name: string; // e.g. "HeroSection"
  category: string; // e.g. "home", "about"
  excerpt: string; // first ~40 lines for AI to see structure
}

export interface PageInfo {
  route: string; // e.g. "/about"
  source: string; // full file source
}

const SAFE_DIR_ALLOWLIST = ["home", "about", "alpha", "give", "serve", "visit", "missions", "new-here", "help", "whats-on", "sermons", "youth-alpha", "connect-card"];

/**
 * Walk components directory and return a catalog of importable components.
 */
export async function getComponentCatalog(): Promise<ComponentInfo[]> {
  const out: ComponentInfo[] = [];

  for (const dir of SAFE_DIR_ALLOWLIST) {
    const dirPath = path.join(COMPONENTS_DIR, dir);
    let files: string[] = [];
    try {
      files = await fs.readdir(dirPath);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith(".tsx")) continue;
      const filePath = path.join(dirPath, file);
      const name = file.replace(/\.tsx$/, "");
      const source = await fs.readFile(filePath, "utf-8");
      const lines = source.split("\n").slice(0, 40).join("\n");
      out.push({
        importPath: `@/components/${dir}/${name}`,
        name,
        category: dir,
        excerpt: lines,
      });
    }
  }
  return out;
}

/**
 * Read a few representative existing pages so the AI can see file structure.
 */
export async function getReferencePages(routes = ["about", "alpha", "give"]): Promise<PageInfo[]> {
  const out: PageInfo[] = [];
  for (const route of routes) {
    const filePath = path.join(APP_DIR, route, "page.tsx");
    try {
      const source = await fs.readFile(filePath, "utf-8");
      out.push({ route: `/${route}`, source });
    } catch {
      continue;
    }
  }
  return out;
}

/**
 * Resolve and validate a proposed slug into a safe app/ route directory.
 * Throws if the slug would escape the app/ directory or collide with existing files.
 */
export function resolvePageDir(slug: string): string {
  // Strict slug: lowercase letters, numbers, hyphens only
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }
  const reserved = ["api", "admin", "auth", "_next", "favicon.ico", "robots.ts", "sitemap.ts", "layout.tsx", "page.tsx", "globals.css", "not-found.tsx"];
  if (reserved.includes(slug)) {
    throw new Error(`Slug "${slug}" is reserved`);
  }
  return path.join(APP_DIR, slug);
}

export async function pageDirExists(slug: string): Promise<boolean> {
  try {
    await fs.access(resolvePageDir(slug));
    return true;
  } catch {
    return false;
  }
}

export async function writePageFile(slug: string, source: string): Promise<string> {
  const dir = resolvePageDir(slug);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, "page.tsx");
  await fs.writeFile(filePath, source, "utf-8");
  return path.relative(ROOT, filePath);
}

export async function writeComponentFile(category: string, name: string, source: string): Promise<string> {
  if (!SAFE_DIR_ALLOWLIST.includes(category)) {
    throw new Error(`Component category "${category}" is not allowed`);
  }
  if (!/^[A-Z][A-Za-z0-9]+$/.test(name)) {
    throw new Error(`Invalid component name: ${name}`);
  }
  const dir = path.join(COMPONENTS_DIR, category);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.tsx`);
  await fs.writeFile(filePath, source, "utf-8");
  return path.relative(ROOT, filePath);
}

export async function deletePageFile(slug: string): Promise<void> {
  const dir = resolvePageDir(slug);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
