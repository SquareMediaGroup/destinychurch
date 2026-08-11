// The scripted conversation behind the "New here?" widget.
//
// There is no model here and there is not meant to be one. Every reply is
// written by hand and every route is fixed, so the widget can never invent a
// service time or link somewhere that doesn't exist — the two failure modes that
// matter most for the people this is aimed at. Smart Search (components/
// FloatingSmartSearch.tsx) is the AI surface; this is the guided one.
//
// Shape: a visitor picks a choice, the widget appends their words and then the
// reply of whatever node the choice points at. A choice either advances the
// conversation (`next`) or leaves the site for a page (`href`) — never both, so
// there is never a hidden branch behind a link. That invariant is enforced by
// tests/unit/welcome-chat.spec.ts rather than by types, because the useful error
// message is "which choice is wrong", not "this union doesn't match".

import { ALLOWED_PAGES } from "@/lib/siteKnowledge";

export type ChatChoice = {
  label: string;
  /** Advance to this node. Mutually exclusive with `href`. */
  next?: string;
  /** Internal route this choice opens. Mutually exclusive with `next`. */
  href?: string;
};

export type ChatNode = {
  id: string;
  /** What the church says when the conversation reaches this node. */
  message: string;
  choices: ChatChoice[];
};

export const ROOT_NODE_ID = "root";

/** Opening line, also used as the widget's collapsed label context. */
export const WELCOME_CHAT_NODES: ChatNode[] = [
  {
    id: ROOT_NODE_ID,
    message: "Welcome to Destiny. What brings you here today?",
    choices: [
      { label: "Planning a visit", next: "visit" },
      { label: "I'd like to give", next: "give" },
      { label: "What's coming up", next: "events" },
      { label: "Exploring faith", next: "courses" },
      { label: "Something else", next: "else" },
    ],
  },

  {
    id: "visit",
    message:
      "Lovely — we meet Sundays at 11am at Destiny Centre, Norton Road, Stockton-on-Tees. Doors open at 9:45am and parking is free. Anything you'd like to know before you come?",
    choices: [
      { label: "What about my kids?", next: "visit-kids" },
      { label: "What should I wear?", next: "visit-wear" },
      { label: "Plan my visit", href: "/visit" },
    ],
  },
  {
    id: "visit-kids",
    message:
      "Destiny Kids runs alongside the service for ages 0–11, so you can settle in while they have their own thing. There's a check-in desk in the foyer when you arrive.",
    choices: [
      { label: "Tell me about Destiny Kids", href: "/kids" },
      { label: "Plan my visit", href: "/visit" },
    ],
  },
  {
    id: "visit-wear",
    message:
      "Come as you are — honestly. You'll see everything from jeans and trainers to Sunday best. No dress code, no judgement.",
    choices: [
      { label: "What else should I expect?", href: "/visit" },
      { label: "Anything for my kids?", next: "visit-kids" },
    ],
  },

  {
    id: "give",
    message:
      "Thank you — giving is what keeps everything here running, from Destiny Kids to the work we do across Tees Valley. You can give online, by bank transfer, or by text.",
    choices: [
      { label: "Give now", href: "/give" },
      { label: "Where does it go?", next: "give-where" },
    ],
  },
  {
    id: "give-where",
    message:
      "It funds the day-to-day life of the church and the mission partners we support. Our accounts and charity registration are published in full if you'd like to look.",
    choices: [
      { label: "See our missions", href: "/missions" },
      { label: "Governance & accounts", href: "/governance" },
      { label: "Give now", href: "/give" },
    ],
  },

  {
    id: "events",
    message:
      "There's usually something on midweek as well as Sundays — events, socials and groups that meet across the week.",
    choices: [
      { label: "See what's coming up", href: "/whats-on#events" },
      { label: "Midweek groups", next: "events-groups" },
    ],
  },
  {
    id: "events-groups",
    message:
      "Connect Groups meet in homes across Tees Valley through the week. It's the easiest way to actually get to know people rather than just attending.",
    choices: [
      { label: "Find a group", href: "/connect" },
      { label: "See what's coming up", href: "/whats-on#events" },
    ],
  },

  {
    id: "courses",
    message:
      "We run courses for anyone exploring life, faith and the bigger questions — no background needed and nothing you have to sign up to believe.",
    choices: [
      { label: "Tell me about Alpha", href: "/alpha" },
      { label: "See all courses", href: "/whats-on#courses" },
      { label: "I'm brand new to all this", next: "courses-new" },
    ],
  },
  {
    id: "courses-new",
    message:
      "Then you're in exactly the right place. Our New Here page walks through what we believe and what a Sunday actually looks like, with nothing assumed.",
    choices: [
      { label: "Start with New Here", href: "/new-here" },
      { label: "Tell me about Alpha", href: "/alpha" },
    ],
  },

  {
    id: "else",
    message:
      "No problem. Here are the quickest ways to find what you're after — or to reach a real person.",
    choices: [
      { label: "Contact the team", href: "/contact" },
      { label: "Help centre", href: "/help" },
      { label: "Plan a visit", href: "/visit" },
    ],
  },
];

const BY_ID = new Map(WELCOME_CHAT_NODES.map((n) => [n.id, n]));

export function getChatNode(id: string): ChatNode | undefined {
  return BY_ID.get(id);
}

/** A choice that leaves the site for a page, rather than advancing the thread. */
export function isLinkChoice(
  choice: ChatChoice,
): choice is ChatChoice & { href: string } {
  return typeof choice.href === "string";
}

/**
 * The route part of an href, without any `#section`. `/whats-on#events` and
 * `/whats-on` are the same page as far as the allowlist is concerned.
 */
export function routeOf(href: string): string {
  return href.split("#")[0];
}

/** Every route the script can send someone to is a real, known page. */
export function isKnownRoute(href: string): boolean {
  return ALLOWED_PAGES.has(routeOf(href));
}
