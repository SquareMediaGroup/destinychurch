// Page builder type definitions

export type ElementType =
  // Primitives
  | "text"
  | "heading"
  | "image"
  | "button"
  | "card"
  | "spacer"
  | "divider"
  // Layout
  | "section"
  | "container"
  | "columns"
  | "stack"
  | "grid"
  // CMS
  | "sermonsList"
  | "eventsList"
  // Brand components (existing component library)
  | "HeroSection"
  | "MissionSection"
  | "WhatsOnSection"
  | "WorshipWithUsSection"
  | "GetInvolvedSection"
  | "LatestSermonSection"
  | "EveryoneHasAPlaceSection"
  | "AboutHero"
  | "AboutMissionStatement"
  | "AboutMissionCard"
  | "BeliefsSection"
  | "MeetPastorsSection"
  | "TeamSection"
  | "MagnifySection"
  | "MinistriesGrid";

export type WidthValue = "auto" | "full" | "1/2" | "1/3" | "2/3" | "1/4" | "3/4";

export type LayoutProps = {
  width?: WidthValue;
  widthMd?: WidthValue;
  widthLg?: WidthValue;
  marginTop?: number;
  marginBottom?: number;
  paddingX?: number;
  paddingY?: number;
  align?: "left" | "center" | "right";
};

export type BuilderElement = {
  id: string;
  type: ElementType;
  props: Record<string, unknown>;
  layout?: LayoutProps;
  children?: BuilderElement[];
};

export type BuilderPage = {
  id?: string;
  slug: string;
  title: string;
  layout_json: BuilderElement[];
  status: "draft" | "published" | "archived";
  template_id?: string | null;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
};

export type BuilderTemplate = {
  id: string;
  name: string;
  description: string | null;
  layout_json: BuilderElement[];
  preview_image_url: string | null;
};

export function newId(): string {
  return `el_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}
