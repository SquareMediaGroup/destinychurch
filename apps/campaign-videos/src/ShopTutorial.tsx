import manifest from "./tutorials/shop-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

/** Admin help: everything a Store Admin can do. Filmed by capture/shop-tutorial.cjs. */
const shop = defineTutorial({
  id: "shop",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · Store Admin",
  title: "Running the shop.",
  accent: ["shop"],
  blurb: "Everything a Store Admin can do, step by step, on the real admin.",
});
export const ShopTutorial = shop.Component;
export const SHOP_TUTORIAL_FRAMES = shop.frames;
