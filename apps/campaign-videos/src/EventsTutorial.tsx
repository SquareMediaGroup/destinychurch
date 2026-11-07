import manifest from "./tutorials/events-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything an Event Admin can do. Filmed by capture/events-tutorial.cjs. */
const events = defineTutorial({
  id: "events",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Event Admin",
  title: "Courses, events and announcements.",
  accent: ["events"],
  blurb: "Everything an Event Admin can do, step by step, on the real admin.",
});
export const EventsTutorial = events.Component;
export const EVENTS_TUTORIAL_FRAMES = events.frames;
