import type { BuilderElement } from "./types";
import { newId } from "./types";

export type TemplateDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  build: () => BuilderElement[];
};

function el(
  type: BuilderElement["type"],
  props: Record<string, unknown> = {},
  children?: BuilderElement[],
  layout?: BuilderElement["layout"],
): BuilderElement {
  return { id: newId(), type, props, ...(children ? { children } : {}), ...(layout ? { layout } : {}) };
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "blank",
    name: "Blank canvas",
    description: "Start from an empty page.",
    icon: "draft",
    build: () => [],
  },
  {
    id: "hero-content",
    name: "Hero + content",
    description: "Brand hero with two content sections below.",
    icon: "view_agenda",
    build: () => [
      el("HeroSection"),
      el(
        "section",
        { background: "white", align: "center" },
        [
          el("heading", { content: "Welcome to our church", level: 2 }, undefined, { align: "center", marginBottom: 4 }),
          el(
            "text",
            {
              content:
                "We are a community of people who believe everyone has a place. Discover what God has for you here.",
            },
            undefined,
            { align: "center", width: "2/3" },
          ),
          el("button", { label: "Plan a visit", href: "/visit", variant: "primary" }, undefined, {
            align: "center",
            marginTop: 6,
          }),
        ],
      ),
      el("MissionSection"),
    ],
  },
  {
    id: "two-column",
    name: "Two-column intro",
    description: "Heading and copy beside an image.",
    icon: "view_column",
    build: () => [
      el(
        "section",
        { background: "white", align: "stretch" },
        [
          el(
            "columns",
            { direction: "row", gap: 8, align: "center", justify: "start" },
            [
              el("container", {}, [
                el("heading", { content: "About us", level: 1 }, undefined, { marginBottom: 4 }),
                el(
                  "text",
                  {
                    content:
                      "We exist to help everyone find a place to belong, grow in faith, and live out their God-given purpose.",
                  },
                  undefined,
                  { marginBottom: 6 },
                ),
                el("button", { label: "Read more", href: "/about", variant: "primary" }),
              ]),
              el("image", { src: "", alt: "About image", aspect: "4/3" }),
            ],
          ),
        ],
      ),
    ],
  },
  {
    id: "team-cards",
    name: "Meet the team",
    description: "Headline followed by team and pastors sections.",
    icon: "groups",
    build: () => [
      el(
        "section",
        { background: "grey", align: "center" },
        [
          el("heading", { content: "Meet our team", level: 1 }, undefined, { align: "center" }),
          el(
            "text",
            { content: "The people behind Destiny Church." },
            undefined,
            { align: "center", marginTop: 2 },
          ),
        ],
      ),
      el("MeetPastorsSection"),
      el("TeamSection"),
    ],
  },
  {
    id: "beliefs",
    name: "What we believe",
    description: "About hero with mission and beliefs sections.",
    icon: "menu_book",
    build: () => [
      el("AboutHero"),
      el("AboutMissionStatement"),
      el("BeliefsSection"),
    ],
  },
];

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
