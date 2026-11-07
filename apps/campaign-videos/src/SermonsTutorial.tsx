import manifest from "./tutorials/sermons-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Sermon Admin can do. Filmed by capture/sermons-tutorial.cjs. */
const sermons = defineTutorial({
  id: "sermons",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Sermon Admin",
  title: "Sermons on the podcast.",
  accent: ["podcast"],
  blurb: "Everything a Sermon Admin can do, step by step, on the real admin.",
});
export const SermonsTutorial = sermons.Component;
export const SERMONS_TUTORIAL_FRAMES = sermons.frames;
