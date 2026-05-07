import { z } from "zod";

// Base schemas for common prop patterns
const ctaButtonSchema = z.object({
  label: z.string().max(50),
  href: z.string().url(),
  variant: z.enum(["primary", "secondary"]).optional(),
});

const imageSchema = z.object({
  src: z.string().url(),
  alt: z.string(),
  aspectRatio: z.enum(["16/9", "4/3", "1/1", "3/2"]).optional(),
});

// Brand component props schemas
export const heroSectionPropsSchema = z.object({
  title: z.string().max(80),
  subtitle: z.string().max(150).optional(),
  backgroundImage: z.string().url().optional(),
  ctas: z.array(ctaButtonSchema).max(2).optional(),
});

export const missionSectionPropsSchema = z.object({
  title: z.string().max(100).optional(),
  content: z.string().max(500).optional(),
  images: z.array(imageSchema).optional(),
});

export const whatsOnSectionPropsSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(300).optional(),
});

export const worshipWithUsSectionPropsSchema = z.object({
  title: z.string().max(80).optional(),
  subtitle: z.string().max(150).optional(),
  cta: ctaButtonSchema.optional(),
});

export const getInvolvedSectionPropsSchema = z.object({
  title: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
  ctas: z.array(ctaButtonSchema).max(2).optional(),
});

export const latestSermonSectionPropsSchema = z.object({
  title: z.string().max(100).optional(),
});

export const everyoneHasAPlaceSectionPropsSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(300).optional(),
  images: z.array(imageSchema).optional(),
});

export const aboutHeroPropsSchema = z.object({
  title: z.string().max(80),
  subtitle: z.string().max(150).optional(),
  backgroundImage: z.string().url().optional(),
});

export const aboutMissionStatementPropsSchema = z.object({
  content: z.string().max(500).optional(),
});

export const aboutMissionCardPropsSchema = z.object({
  title: z.string().max(100).optional(),
  cards: z.array(z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),
  })).optional(),
});

export const beliefsSectionPropsSchema = z.object({
  title: z.string().max(100).optional(),
  content: z.string().max(1000).optional(),
});

export const meetPastorsSectionPropsSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(300).optional(),
});

export const teamSectionPropsSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(300).optional(),
});

export const magnifySectionPropsSchema = z.object({
  title: z.string().max(80).optional(),
  description: z.string().max(300).optional(),
  image: imageSchema.optional(),
});

export const ministriesGridPropsSchema = z.object({
  title: z.string().max(100).optional(),
  description: z.string().max(300).optional(),
});

// Primitive component schemas
export const textPropsSchema = z.object({
  content: z.string(),
  align: z.enum(["left", "center", "right"]).optional(),
});

export const headingPropsSchema = z.object({
  text: z.string().max(200),
  level: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

export const imagePropsSchema = z.object({
  src: z.string().url(),
  alt: z.string(),
  aspectRatio: z.enum(["16/9", "4/3", "1/1", "3/2"]).optional(),
});

export const buttonPropsSchema = z.object({
  label: z.string().max(50),
  href: z.string().url(),
  variant: z.enum(["primary", "secondary"]).optional(),
});

export const cardPropsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  image: imageSchema.optional(),
});

// Layout component schemas
export const sectionPropsSchema = z.object({
  // Sections use layout props, so minimal prop-specific schema
});

export const containerPropsSchema = z.object({
  // Containers use layout props for structure
});

export const stackPropsSchema = z.object({
  direction: z.enum(["vertical", "horizontal"]).optional(),
  gap: z.number().min(0).max(12).optional(),
});

export const gridPropsSchema = z.object({
  columns: z.number().min(1).max(6).optional(),
  gap: z.number().min(0).max(12).optional(),
});

export const columnsPropsSchema = z.object({
  count: z.number().min(2).max(4).optional(),
});

// CMS component schemas
export const sermonsListPropsSchema = z.object({
  title: z.string().max(100).optional(),
  limit: z.number().min(1).max(10).optional(),
});

export const eventsListPropsSchema = z.object({
  title: z.string().max(100).optional(),
  filter: z.string().optional(),
  limit: z.number().min(1).max(10).optional(),
});

// Export master schema map for easy lookup
export const PROPS_SCHEMAS = {
  // Brand components
  HeroSection: heroSectionPropsSchema,
  MissionSection: missionSectionPropsSchema,
  WhatsOnSection: whatsOnSectionPropsSchema,
  WorshipWithUsSection: worshipWithUsSectionPropsSchema,
  GetInvolvedSection: getInvolvedSectionPropsSchema,
  LatestSermonSection: latestSermonSectionPropsSchema,
  EveryoneHasAPlaceSection: everyoneHasAPlaceSectionPropsSchema,
  AboutHero: aboutHeroPropsSchema,
  AboutMissionStatement: aboutMissionStatementPropsSchema,
  AboutMissionCard: aboutMissionCardPropsSchema,
  BeliefsSection: beliefsSectionPropsSchema,
  MeetPastorsSection: meetPastorsSectionPropsSchema,
  TeamSection: teamSectionPropsSchema,
  MagnifySection: magnifySectionPropsSchema,
  MinistriesGrid: ministriesGridPropsSchema,

  // Primitives
  text: textPropsSchema,
  heading: headingPropsSchema,
  image: imagePropsSchema,
  button: buttonPropsSchema,
  card: cardPropsSchema,

  // Layout
  section: sectionPropsSchema,
  container: containerPropsSchema,
  stack: stackPropsSchema,
  grid: gridPropsSchema,
  columns: columnsPropsSchema,

  // CMS
  sermonsList: sermonsListPropsSchema,
  eventsList: eventsListPropsSchema,
} as const;

// Validate props against a component's schema
export function validateComponentProps(
  componentType: keyof typeof PROPS_SCHEMAS,
  props: unknown
) {
  const schema = PROPS_SCHEMAS[componentType];
  if (!schema) {
    throw new Error(`No schema found for component type: ${componentType}`);
  }
  return schema.parse(props);
}

// Check if props are valid (soft validation, doesn't throw)
export function arePropsValid(
  componentType: keyof typeof PROPS_SCHEMAS,
  props: unknown
): boolean {
  const schema = PROPS_SCHEMAS[componentType];
  if (!schema) return false;
  try {
    schema.parse(props);
    return true;
  } catch {
    return false;
  }
}
