import manifest from "./tutorials/design-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Design Admin can do. Filmed by capture/design-tutorial.cjs. */
const design = defineTutorial({
  id: "design",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Design Admin",
  title: "From request to finished design.",
  accent: ["design"],
  blurb: "Everything a Design Admin can do, step by step, on the real admin.",
});
export const DesignTutorial = design.Component;
export const DESIGN_TUTORIAL_FRAMES = design.frames;
