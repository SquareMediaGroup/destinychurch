import manifest from "./tutorials/site-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Site Admin can do. Filmed by capture/site-tutorial.cjs. */
const site = defineTutorial({
  id: "site",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Site Admin",
  title: "Pages, links and the status page.",
  accent: ["Pages"],
  blurb: "Everything a Site Admin can do, step by step, on the real admin.",
});
export const SiteTutorial = site.Component;
export const SITE_TUTORIAL_FRAMES = site.frames;
