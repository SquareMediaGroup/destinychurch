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
