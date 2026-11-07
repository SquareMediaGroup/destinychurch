import manifest from "./tutorials/training-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Training Admin can do. Filmed by capture/training-tutorial.cjs. */
const training = defineTutorial({
  id: "training",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Training Admin",
  title: "Training for every team.",
  accent: ["team"],
  blurb: "Everything a Training Admin can do, step by step, on the real admin.",
});
export const TrainingTutorial = training.Component;
export const TRAINING_TUTORIAL_FRAMES = training.frames;
