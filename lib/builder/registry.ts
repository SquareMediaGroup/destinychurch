import type { ElementType } from "./types";

export type AIHints = {
  useFor: string[]; // e.g., ["page_header", "alpha_launch", "event_promotion"]
  contentType: "story" | "cta" | "info" | "community" | "media" | "list" | "contact";
  canAppear?: "first" | "middle" | "last" | "any"; // Where in page structure
  props?: Record<string, string>; // Hints for what each prop should contain
};

export type ElementMeta = {
  type: ElementType;
  label: string;
  icon: string;
  category: "Primitive" | "Layout" | "CMS" | "Brand";
  description: string;
  aiHints?: AIHints; // Optional AI guidance
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
  {
    type: "HeroSection",
    label: "Hero (Home)",
    icon: "stars",
    category: "Brand",
    description: "Homepage hero with video",
    aiHints: {
      useFor: ["page_header", "campaign_launch", "event_hero", "alpha_launch"],
      contentType: "story",
      canAppear: "first",
      props: {
        title: "Main headline (60-80 chars, action-oriented)",
        subtitle: "Supporting text (100-150 chars)",
        backgroundImage: "Background image URL (optional)",
        ctas: "Array of 1-2 call-to-action buttons"
      }
    }
  },
  {
    type: "MissionSection",
    label: "Mission",
    icon: "campaign",
    category: "Brand",
    description: "Mission statement section",
    aiHints: {
      useFor: ["mission_context", "about_page", "identity"],
      contentType: "info",
      canAppear: "any",
      props: {
        title: "Section title",
        content: "Mission statement or context",
        images: "Optional pastor/team photos"
      }
    }
  },
  {
    type: "WhatsOnSection",
    label: "What's On",
    icon: "event_note",
    category: "Brand",
    description: "Upcoming events list",
    aiHints: {
      useFor: ["event_promotion", "calendar_highlight", "what_to_do"],
      contentType: "list",
      canAppear: "middle",
      props: {
        title: "Section title",
        description: "Intro text about upcoming events"
      }
    }
  },
  {
    type: "WorshipWithUsSection",
    label: "Worship With Us",
    icon: "music_note",
    category: "Brand",
    description: "Worship invitation",
    aiHints: {
      useFor: ["worship_invite", "service_info", "attendance_cta"],
      contentType: "cta",
      canAppear: "middle",
      props: {
        title: "Invitation headline",
        subtitle: "Service times or description",
        cta: "Button text and destination"
      }
    }
  },
  {
    type: "GetInvolvedSection",
    label: "Get Involved",
    icon: "volunteer_activism",
    category: "Brand",
    description: "Volunteer/serve CTA",
    aiHints: {
      useFor: ["volunteer_cta", "engagement", "serve_opportunity", "alpha_signup"],
      contentType: "cta",
      canAppear: "middle",
      props: {
        title: "Call-to-action headline",
        description: "Why get involved",
        ctas: "1-2 action buttons"
      }
    }
  },
  {
    type: "LatestSermonSection",
    label: "Latest Sermon",
    icon: "play_circle_outline",
    category: "Brand",
    description: "Most recent sermon",
    aiHints: {
      useFor: ["sermon_highlight", "media_feature", "content_promotion"],
      contentType: "media",
      canAppear: "middle",
      props: {
        title: "Section title"
      }
    }
  },
  {
    type: "EveryoneHasAPlaceSection",
    label: "Everyone Has A Place",
    icon: "diversity_3",
    category: "Brand",
    description: "Community section",
    aiHints: {
      useFor: ["community", "belonging", "identity", "inclusion"],
      contentType: "community",
      canAppear: "middle",
      props: {
        title: "Community message headline",
        description: "What makes this community special",
        images: "Community/people photos"
      }
    }
  },

  // Brand components — About page
  {
    type: "AboutHero",
    label: "About Hero",
    icon: "info",
    category: "Brand",
    description: "About page hero",
    aiHints: {
      useFor: ["about_header", "page_intro", "origin_story"],
      contentType: "story",
      canAppear: "first",
      props: {
        title: "Page headline",
        subtitle: "Subheading or tagline",
        backgroundImage: "Hero background image"
      }
    }
  },
  {
    type: "AboutMissionStatement",
    label: "Mission Statement",
    icon: "auto_awesome",
    category: "Brand",
    description: "About mission text",
    aiHints: {
      useFor: ["mission", "vision", "values", "purpose"],
      contentType: "info",
      canAppear: "any",
      props: {
        content: "Mission/vision statement (250-500 chars)"
      }
    }
  },
  {
    type: "AboutMissionCard",
    label: "Mission Card",
    icon: "view_agenda",
    category: "Brand",
    description: "Mission card grid",
    aiHints: {
      useFor: ["values", "pillars", "core_beliefs", "impact_areas"],
      contentType: "info",
      canAppear: "middle",
      props: {
        title: "Grid title",
        cards: "Array of {title, description, icon}"
      }
    }
  },
  {
    type: "BeliefsSection",
    label: "Beliefs",
    icon: "menu_book",
    category: "Brand",
    description: "Statement of faith",
    aiHints: {
      useFor: ["theology", "doctrine", "beliefs", "faith_statement"],
      contentType: "info",
      canAppear: "any",
      props: {
        title: "Section title",
        content: "Beliefs or statement of faith"
      }
    }
  },
  {
    type: "MeetPastorsSection",
    label: "Meet The Pastors",
    icon: "groups",
    category: "Brand",
    description: "Pastor cards",
    aiHints: {
      useFor: ["leadership", "team_intro", "pastor_bio", "staff"],
      contentType: "community",
      canAppear: "middle",
      props: {
        title: "Section title",
        description: "Intro to pastoral team"
      }
    }
  },
  {
    type: "TeamSection",
    label: "Team",
    icon: "group",
    category: "Brand",
    description: "Team members grid",
    aiHints: {
      useFor: ["staff", "volunteers", "leadership", "team_bio"],
      contentType: "community",
      canAppear: "middle",
      props: {
        title: "Team section title",
        description: "Introduction to team"
      }
    }
  },
  {
    type: "MagnifySection",
    label: "Magnify",
    icon: "ar_on_you",
    category: "Brand",
    description: "Magnify highlight section",
    aiHints: {
      useFor: ["initiative_highlight", "ministry_focus", "campaign"],
      contentType: "story",
      canAppear: "middle",
      props: {
        title: "Highlight headline",
        description: "What's special about this focus",
        image: "Hero/campaign image"
      }
    }
  },
  {
    type: "MinistriesGrid",
    label: "Ministries",
    icon: "grid_view",
    category: "Brand",
    description: "Ministry cards grid",
    aiHints: {
      useFor: ["ministries", "service_areas", "departments", "opportunities"],
      contentType: "list",
      canAppear: "middle",
      props: {
        title: "Ministries title",
        description: "Intro to ministry areas"
      }
    }
  },
];

export function getElementMeta(type: ElementType): ElementMeta | undefined {
  return ELEMENT_REGISTRY.find((m) => m.type === type);
}

export const CATEGORIES: Array<ElementMeta["category"]> = ["Primitive", "Layout", "CMS", "Brand"];
