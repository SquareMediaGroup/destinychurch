import manifest from "./tutorials/super-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Super Admin can do. Filmed by capture/super-tutorial.cjs. */
const superAdmin = defineTutorial({
  id: "super",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Super Admin",
  title: "Running the whole admin.",
  accent: ["whole"],
  blurb: "Everything a Super Admin can do, step by step, on the real admin.",
});
export const SuperTutorial = superAdmin.Component;
export const SUPER_TUTORIAL_FRAMES = superAdmin.frames;
