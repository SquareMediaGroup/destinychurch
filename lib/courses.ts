// Shared registry for the four courses shown in the What's On "Courses" section.
// Each course carries both a `card` config (grid tile) and a `featured` config
// (full-width block). One course is "featured" at a time; the other three render
// as cards, so all four are always visible. The featured course is chosen in
// admin (see /admin/featured-course + the featured_course table).

export type CourseId = "bible_course" | "cap" | "alpha" | "recovery";

// Canonical order used for the grid (featured course is filtered out).
export const COURSE_ORDER: CourseId[] = [
  "bible_course",
  "cap",
  "alpha",
  "recovery",
];

export function isCourseId(value: unknown): value is CourseId {
  return (
    typeof value === "string" &&
    (COURSE_ORDER as string[]).includes(value)
  );
}

export interface CourseCard {
  image: string;
  imageClass?: string; // object-position tweaks on the <Image>
  subtitle?: string; // small uppercase line above the description
  overlay?: {
    eyebrow: string;
    heading: string;
    gradient: string; // inline background for the caption overlay
  };
  title: string;
  titleColor: string; // hex
  description: string;
  cta: { label: string; href: string; color: string }; // color = button hex
}

export interface CourseFeatured {
  image: string;
  gradient: string; // inline background wash over the photo
  eyebrow?: string;
  titleLines: string[]; // rendered with <br/> between lines
  description: string;
  primary: { label: string; href: string; color: string };
  secondary?: { label: string; href: string };
}

export interface CourseDef {
  id: CourseId;
  name: string;
  card: CourseCard;
  featured: CourseFeatured;
}

export const COURSES: Record<CourseId, CourseDef> = {
  bible_course: {
    id: "bible_course",
    name: "The Bible Course",
    card: {
      image: "/img/BibleCourse/presenters.webp",
      imageClass: "object-cover",
      overlay: {
        eyebrow: "By Bible Society",
        heading: "The whole story",
        gradient:
          "linear-gradient(to top, rgba(15,46,66,0.85) 0%, transparent 100%)",
      },
      title: "The Bible Course",
      titleColor: "#1b4965",
      description:
        "An award-winning eight-session journey through the Bible, exploring how the whole story fits together. No experience needed, everyone welcome.",
      cta: { label: "Find out more", href: "/bible-course", color: "#1b4965" },
    },
    featured: {
      image: "/img/BibleCourse/presenters.webp",
      gradient:
        "linear-gradient(to right, rgba(15,46,66,0.9) 0%, rgba(27,73,101,0.7) 45%, rgba(27,73,101,0.25) 100%)",
      eyebrow: "By Bible Society",
      titleLines: ["The Bible", "Course"],
      description:
        "An award-winning eight-session journey through the Bible. Discover how the whole story fits together — no experience needed, everyone welcome.",
      primary: { label: "Find out more", href: "/bible-course", color: "#1b4965" },
      secondary: { label: "Register Interest", href: "/contact" },
    },
  },

  cap: {
    id: "cap",
    name: "CAP Money Course",
    card: {
      image: "/img/photos/Courses/Cap.webp",
      imageClass: "object-cover",
      subtitle: "Cap Money",
      title: "CAP Money Course",
      titleColor: "#f58021",
      description:
        "The CAP Money Course is a revolutionary money management course that teaches a simple budgeting system that really works.",
      cta: { label: "Register Interest", href: "/contact", color: "#363f48" },
    },
    featured: {
      image: "/img/photos/Courses/Cap.webp",
      gradient:
        "linear-gradient(to right, rgba(54,63,72,0.92) 0%, rgba(54,63,72,0.6) 45%, rgba(54,63,72,0.2) 100%)",
      eyebrow: "Take control of your money",
      titleLines: ["CAP Money", "Course"],
      description:
        "A revolutionary money management course that teaches a simple budgeting system that really works — free, friendly and genuinely practical.",
      primary: { label: "Register Interest", href: "/contact", color: "#363f48" },
    },
  },

  alpha: {
    id: "alpha",
    name: "Alpha",
    card: {
      image: "/img/photos/Courses/Alpha.webp",
      imageClass: "object-cover object-bottom",
      overlay: {
        eyebrow: "There's more to explore. Try Alpha.",
        heading: "Stay Curious",
        gradient:
          "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)",
      },
      title: "Alpha",
      titleColor: "#f58021",
      description:
        "Alpha is a series of sessions exploring the Christian faith. Typically run over eleven weeks, each session looks at a different question around faith and is designed to create conversation.",
      cta: { label: "Try Alpha", href: "/alpha", color: "#f58021" },
    },
    featured: {
      image: "/img/photos/Courses/Alpha.webp",
      gradient:
        "linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.1) 100%)",
      eyebrow: "There's more to explore. Try Alpha.",
      titleLines: ["Stay", "Curious"],
      description:
        "Alpha is a series of relaxed sessions exploring the Christian faith. Come with your questions — every session is a conversation, with no pressure and no judgement.",
      primary: { label: "Try Alpha", href: "/alpha", color: "#f58021" },
      secondary: { label: "Register Interest", href: "/contact" },
    },
  },

  recovery: {
    id: "recovery",
    name: "Destiny Recovery",
    card: {
      image: "/img/DCRecovery/Hero.webp",
      imageClass: "object-cover",
      overlay: {
        eyebrow: "A 12-step Christ-centred journey.",
        heading: "Find Healing",
        gradient:
          "linear-gradient(to top, rgba(0,81,63,0.85) 0%, rgba(0,103,86,0.4) 50%, transparent 100%)",
      },
      title: "Destiny Recovery",
      titleColor: "#006756",
      description:
        "Christian recovery support that meets you where you are. A 12-step programme providing a Christ-centred pathway to overcoming struggles and healing from emotional wounds.",
      cta: { label: "Learn More", href: "/destiny-recovery", color: "#006756" },
    },
    featured: {
      image: "/img/DCRecovery/Hero.webp",
      gradient:
        "linear-gradient(to right, rgba(0,81,63,0.9) 0%, rgba(0,103,86,0.55) 45%, rgba(0,103,86,0.2) 100%)",
      eyebrow: "A 12-step Christ-centred journey.",
      titleLines: ["Find", "Healing"],
      description:
        "Christian recovery support that meets you where you are — a 12-step, Christ-centred pathway to overcoming struggles and healing from emotional wounds.",
      primary: { label: "Learn More", href: "/destiny-recovery", color: "#006756" },
      secondary: { label: "Contact Pastoral Team", href: "/contact" },
    },
  },
};
