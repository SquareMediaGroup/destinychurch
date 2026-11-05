import manifest from "./tutorials/hr-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything an HR Admin can do. Filmed by capture/hr-tutorial.cjs. */
const hr = defineTutorial({
  id: "hr",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · HR Admin",
  title: "Looking after the team.",
  accent: ["team"],
  blurb: "Everything an HR Admin can do, step by step, on the real admin.",
});
export const HrTutorial = hr.Component;
export const HR_TUTORIAL_FRAMES = hr.frames;
