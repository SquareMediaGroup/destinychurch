import type { BuilderElement, ElementType } from "./types";
import { newId } from "./types";

// Default props and layout for newly added elements
export function createElement(type: ElementType): BuilderElement {
  const base: BuilderElement = {
    id: newId(),
    type,
    props: {},
    layout: { width: "full", marginTop: 0, marginBottom: 0 },
  };

  switch (type) {
    case "text":
      return { ...base, props: { content: "Edit me — your text here." } };
    case "heading":
      return { ...base, props: { content: "Heading", level: 2 } };
    case "image":
      return {
        ...base,
        props: {
          src: "/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg",
          alt: "Image",
          aspect: "16/9",
        },
      };
    case "button":
      return {
        ...base,
        props: { label: "Click me", href: "#", variant: "primary" },
        layout: { ...base.layout, align: "left" },
      };
    case "spacer":
      return { ...base, props: { height: 32 } };
    case "divider":
      return { ...base, props: {} };
    case "section":
      return {
        ...base,
        props: { background: "white" },
        children: [],
      };
    case "container":
      return { ...base, props: {}, children: [] };
    case "columns":
      return {
        ...base,
        props: { count: 2, gap: 4 },
        children: [
          { id: newId(), type: "container", props: {}, children: [] },
          { id: newId(), type: "container", props: {}, children: [] },
        ],
      };
    case "stack":
      return {
        ...base,
        props: { direction: "vertical", gap: 4, align: "stretch", justify: "start" },
        children: [],
      };
    case "grid":
      return {
        ...base,
        props: { columns: 3, columnsMd: 2, columnsSm: 1, gap: 4 },
        children: [],
      };
    case "card":
      return {
        ...base,
        props: { padding: 6, background: "white", border: true, shadow: "sm" },
        children: [
          { id: newId(), type: "heading", props: { content: "Card title", level: 3 } },
          { id: newId(), type: "text", props: { content: "Card body — replace with your content." } },
        ],
      };
    case "sermonsList":
      return { ...base, props: { limit: 3 } };
    case "eventsList":
      return { ...base, props: { limit: 3, type: "alpha" } };
    // Brand components — pre-styled, not editable beyond high-level toggles
    case "HeroSection":
    case "MissionSection":
    case "WhatsOnSection":
    case "WorshipWithUsSection":
    case "GetInvolvedSection":
    case "LatestSermonSection":
    case "EveryoneHasAPlaceSection":
    case "AboutHero":
    case "AboutMissionStatement":
    case "AboutMissionCard":
    case "BeliefsSection":
    case "MeetPastorsSection":
    case "TeamSection":
    case "MagnifySection":
    case "MinistriesGrid":
      return { ...base, props: {} };
    default:
      return base;
  }
}
