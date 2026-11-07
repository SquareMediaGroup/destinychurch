import manifest from "./tutorials/d1-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Destiny One Admin can do. Filmed by capture/d1-tutorial.cjs. */
const d1 = defineTutorial({
  id: "d1",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Destiny One Admin",
  title: "Looking after the members' app.",
  accent: ["members'"],
  blurb: "Everything a Destiny One Admin can do, step by step, on the real admin.",
});
export const DestinyOneAdminTutorial = d1.Component;
export const DESTINY_ONE_ADMIN_TUTORIAL_FRAMES = d1.frames;
