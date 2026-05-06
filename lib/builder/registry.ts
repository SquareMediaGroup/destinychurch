import type { ElementType } from "./types";

export type ElementMeta = {
  type: ElementType;
  label: string;
  icon: string;
  category: "Primitive" | "Layout" | "CMS" | "Brand";
  description: string;
};

export const ELEMENT_REGISTRY: ElementMeta[] = [
  // Primitives
  { type: "heading", label: "Heading", icon: "title", category: "Primitive", description: "Page heading or section title" },
  { type: "text", label: "Text", icon: "notes", category: "Primitive", description: "Paragraph or body text" },
  { type: "image", label: "Image", icon: "image", category: "Primitive", description: "Picture or illustration" },
  { type: "button", label: "Button", icon: "smart_button", category: "Primitive", description: "Call-to-action button" },
  { type: "card", label: "Card", icon: "dashboard", category: "Primitive", description: "Boxed content card" },
  { type: "spacer", label: "Spacer", icon: "height", category: "Primitive", description: "Vertical empty space" },
  { type: "divider", label: "Divider", icon: "horizontal_rule", category: "Primitive", description: "Horizontal line separator" },

  // Layout
  { type: "section", label: "Section", icon: "view_day", category: "Layout", description: "Full-width container with padding" },
  { type: "container", label: "Container", icon: "select_all", category: "Layout", description: "Group of elements" },
  { type: "stack", label: "Stack", icon: "view_stream", category: "Layout", description: "Stack children vertically or horizontally" },
  { type: "grid", label: "Grid", icon: "grid_view", category: "Layout", description: "N-column responsive grid" },
  { type: "columns", label: "Columns", icon: "view_column", category: "Layout", description: "Multi-column flex row" },

  // CMS
  { type: "sermonsList", label: "Sermons list", icon: "play_circle", category: "CMS", description: "Latest sermons from YouTube" },
  { type: "eventsList", label: "Events list", icon: "event", category: "CMS", description: "Active events from database" },

  // Brand components — Home page sections
  { type: "HeroSection", label: "Hero (Home)", icon: "stars", category: "Brand", description: "Homepage hero with video" },
  { type: "MissionSection", label: "Mission", icon: "campaign", category: "Brand", description: "Mission statement section" },
  { type: "WhatsOnSection", label: "What's On", icon: "event_note", category: "Brand", description: "Upcoming events list" },
  { type: "WorshipWithUsSection", label: "Worship With Us", icon: "music_note", category: "Brand", description: "Worship invitation" },
  { type: "GetInvolvedSection", label: "Get Involved", icon: "volunteer_activism", category: "Brand", description: "Volunteer/serve CTA" },
  { type: "LatestSermonSection", label: "Latest Sermon", icon: "play_circle_outline", category: "Brand", description: "Most recent sermon" },
  { type: "EveryoneHasAPlaceSection", label: "Everyone Has A Place", icon: "diversity_3", category: "Brand", description: "Community section" },

  // Brand components — About page
  { type: "AboutHero", label: "About Hero", icon: "info", category: "Brand", description: "About page hero" },
  { type: "AboutMissionStatement", label: "Mission Statement", icon: "auto_awesome", category: "Brand", description: "About mission text" },
  { type: "AboutMissionCard", label: "Mission Card", icon: "view_agenda", category: "Brand", description: "Mission card grid" },
  { type: "BeliefsSection", label: "Beliefs", icon: "menu_book", category: "Brand", description: "Statement of faith" },
  { type: "MeetPastorsSection", label: "Meet The Pastors", icon: "groups", category: "Brand", description: "Pastor cards" },
  { type: "TeamSection", label: "Team", icon: "group", category: "Brand", description: "Team members grid" },
  { type: "MagnifySection", label: "Magnify", icon: "ar_on_you", category: "Brand", description: "Magnify highlight section" },
  { type: "MinistriesGrid", label: "Ministries", icon: "grid_view", category: "Brand", description: "Ministry cards grid" },
];

export function getElementMeta(type: ElementType): ElementMeta | undefined {
  return ELEMENT_REGISTRY.find((m) => m.type === type);
}

export const CATEGORIES: Array<ElementMeta["category"]> = ["Primitive", "Layout", "CMS", "Brand"];
