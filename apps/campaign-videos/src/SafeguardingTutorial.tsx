import manifest from "./tutorials/safeguarding-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Safeguarding Admin can do. Filmed by capture/safeguarding-tutorial.cjs. */
const safeguarding = defineTutorial({
  id: "safeguarding",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Safeguarding Admin",
  title: "Keeping Destiny One safe.",
  accent: ["safe"],
  blurb: "Everything a Safeguarding Admin can do, step by step. The people and messages shown are invented.",
});
export const SafeguardingTutorial = safeguarding.Component;
export const SAFEGUARDING_TUTORIAL_FRAMES = safeguarding.frames;
