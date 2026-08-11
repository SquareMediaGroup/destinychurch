import { test, expect } from "@playwright/test";
import {
  ROOT_NODE_ID,
  WELCOME_CHAT_NODES,
  getChatNode,
  isKnownRoute,
  isLinkChoice,
  routeOf,
} from "../../lib/welcomeChat";

/**
 * The widget's whole promise is that it can't send someone somewhere that
 * doesn't exist and can't strand them mid-conversation. Nothing checks that at
 * runtime — a typo'd `next` just renders a dead button — so it's checked here.
 */

test("the root node exists and opens the conversation", () => {
  const root = getChatNode(ROOT_NODE_ID);
  expect(root).toBeDefined();
  expect(root!.message.length).toBeGreaterThan(0);
  expect(root!.choices.length).toBeGreaterThan(1);
});

test("node ids are unique", () => {
  const ids = WELCOME_CHAT_NODES.map((n) => n.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("every choice either advances or links, never both and never neither", () => {
  for (const node of WELCOME_CHAT_NODES) {
    for (const choice of node.choices) {
      const advances = typeof choice.next === "string";
      const links = typeof choice.href === "string";
      expect(
        advances !== links,
        `"${choice.label}" in node "${node.id}" must have exactly one of next/href`,
      ).toBe(true);
    }
  }
});

test("every `next` points at a node that exists", () => {
  for (const node of WELCOME_CHAT_NODES) {
    for (const choice of node.choices) {
      if (choice.next === undefined) continue;
      expect(
        getChatNode(choice.next),
        `"${choice.label}" in node "${node.id}" points at missing node "${choice.next}"`,
      ).toBeDefined();
    }
  }
});

test("every link goes to a real page in the site allowlist", () => {
  for (const node of WELCOME_CHAT_NODES) {
    for (const choice of node.choices) {
      if (!isLinkChoice(choice)) continue;
      expect(choice.href.startsWith("/")).toBe(true);
      expect(
        isKnownRoute(choice.href),
        `"${choice.label}" in node "${node.id}" links to unknown route "${choice.href}"`,
      ).toBe(true);
    }
  }
});

test("a section anchor resolves to its page", () => {
  expect(routeOf("/whats-on#events")).toBe("/whats-on");
  expect(routeOf("/visit")).toBe("/visit");
  expect(isKnownRoute("/whats-on#courses")).toBe(true);
  expect(isKnownRoute("/not-a-real-page")).toBe(false);
});

test("every node is reachable from the root", () => {
  const seen = new Set<string>([ROOT_NODE_ID]);
  const queue = [ROOT_NODE_ID];
  while (queue.length) {
    const node = getChatNode(queue.shift()!);
    for (const choice of node?.choices ?? []) {
      if (choice.next && !seen.has(choice.next)) {
        seen.add(choice.next);
        queue.push(choice.next);
      }
    }
  }
  const orphans = WELCOME_CHAT_NODES.map((n) => n.id).filter((id) => !seen.has(id));
  expect(orphans, `unreachable nodes: ${orphans.join(", ")}`).toEqual([]);
});

test("every conversation can reach a page — no dead ends", () => {
  for (const node of WELCOME_CHAT_NODES) {
    // Walk forward from this node; every path must eventually offer a link.
    const seen = new Set([node.id]);
    const queue = [node.id];
    let reachesLink = false;
    while (queue.length && !reachesLink) {
      const current = getChatNode(queue.shift()!);
      for (const choice of current?.choices ?? []) {
        if (isLinkChoice(choice)) {
          reachesLink = true;
          break;
        }
        if (choice.next && !seen.has(choice.next)) {
          seen.add(choice.next);
          queue.push(choice.next);
        }
      }
    }
    expect(reachesLink, `node "${node.id}" can never reach a page`).toBe(true);
  }
});
