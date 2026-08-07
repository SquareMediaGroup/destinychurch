import { notFound } from "next/navigation";
import BlockSandbox from "./BlockSandbox";

/**
 * Development-only harness for the block editor. See ./BlockSandbox.
 *
 * Gated the same way as the block gallery at /dev/blocks: this is a tool, not
 * content, and it mounts admin UI without an auth check — so it must never be
 * reachable in production.
 */
export const dynamic = "force-static";

export default function BlockSandboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BlockSandbox />;
}
