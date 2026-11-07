// Church cards: the pre-made UI that Smart Search (web) and DestinyAI (the
// Destiny One app) show instead of a paragraph when someone asks about a
// person, a ministry, visiting, giving, the live service, a course or a job.
//
// Two shapes cover everything, so each surface only needs two renderers:
//   - PersonCardData: a pastor or team member (photo, role, bio, email).
//   - InfoCardData: everything else (title, summary, labelled facts, buttons).
//
// The card is built from structured data on the server and sent to the client
// as-is. The model never writes a card, so figures such as bank details and
// service times cannot be invented, and rendering costs no tokens.

export interface PersonCardData {
  id: string;
  name: string;
  role: string;
  /** Absolute URL, or a site-relative path on the web. */
  photo: string | null;
  email: string | null;
  /** Never invented: a person with no bio renders as role and ministry only. */
  bio: string | null;
  leads: string[];
  /** Page that explains what they lead. */
  href: string | null;
}

export interface CardFact {
  label: string;
  value: string;
  /** Show a copy button next to the value (bank details, text-to-give number). */
  copy?: boolean;
}

export interface CardAction {
  label: string;
  /** Site-relative path, absolute URL, mailto: or tel:. */
  href: string;
}

export type InfoCardVariant =
  | "ministry"
  | "serve"
  | "connect"
  | "next-step"
  | "mission"
  | "visit"
  | "giving"
  | "live"
  | "course"
  | "job"
  | "weather"
  | "directions"
  | "product";

export interface InfoCardData {
  id: string;
  variant: InfoCardVariant;
  title: string;
  /** Small line above the title ("Kids", "Live now"). */
  eyebrow: string | null;
  summary: string | null;
  facts: CardFact[];
  actions: CardAction[];
  image: string | null;
}

/** What the four church-info tools return alongside a one-line summary for the model. */
export interface ChurchCardSet {
  people?: PersonCardData[];
  info?: InfoCardData[];
}

/** Most cards a single answer shows. */
export const MAX_CARDS = 3;
