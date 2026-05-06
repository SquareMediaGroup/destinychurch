import type { LayoutProps, WidthValue } from "./types";

const baseWidth: Record<WidthValue, string> = {
  auto: "w-auto",
  full: "w-full",
  "1/2": "w-1/2",
  "1/3": "w-1/3",
  "2/3": "w-2/3",
  "1/4": "w-1/4",
  "3/4": "w-3/4",
};

const mdWidth: Record<WidthValue, string> = {
  auto: "md:w-auto",
  full: "md:w-full",
  "1/2": "md:w-1/2",
  "1/3": "md:w-1/3",
  "2/3": "md:w-2/3",
  "1/4": "md:w-1/4",
  "3/4": "md:w-3/4",
};

const lgWidth: Record<WidthValue, string> = {
  auto: "lg:w-auto",
  full: "lg:w-full",
  "1/2": "lg:w-1/2",
  "1/3": "lg:w-1/3",
  "2/3": "lg:w-2/3",
  "1/4": "lg:w-1/4",
  "3/4": "lg:w-3/4",
};

const alignMap: Record<NonNullable<LayoutProps["align"]>, string> = {
  left: "text-left items-start",
  center: "text-center items-center mx-auto",
  right: "text-right items-end ml-auto",
};

// Static class lookups so Tailwind v4 scanner picks them up.
const MT: Record<number, string> = {
  0: "", 1: "mt-1", 2: "mt-2", 3: "mt-3", 4: "mt-4", 5: "mt-5", 6: "mt-6",
  7: "mt-7", 8: "mt-8", 9: "mt-9", 10: "mt-10", 11: "mt-11", 12: "mt-12",
  13: "mt-13", 14: "mt-14", 15: "mt-15", 16: "mt-16", 17: "mt-17", 18: "mt-18",
  19: "mt-19", 20: "mt-20", 21: "mt-21", 22: "mt-22", 23: "mt-23", 24: "mt-24",
};
const MB: Record<number, string> = {
  0: "", 1: "mb-1", 2: "mb-2", 3: "mb-3", 4: "mb-4", 5: "mb-5", 6: "mb-6",
  7: "mb-7", 8: "mb-8", 9: "mb-9", 10: "mb-10", 11: "mb-11", 12: "mb-12",
  13: "mb-13", 14: "mb-14", 15: "mb-15", 16: "mb-16", 17: "mb-17", 18: "mb-18",
  19: "mb-19", 20: "mb-20", 21: "mb-21", 22: "mb-22", 23: "mb-23", 24: "mb-24",
};
const PX: Record<number, string> = {
  0: "", 1: "px-1", 2: "px-2", 3: "px-3", 4: "px-4", 5: "px-5", 6: "px-6",
  7: "px-7", 8: "px-8", 9: "px-9", 10: "px-10", 11: "px-11", 12: "px-12",
};
const PY: Record<number, string> = {
  0: "", 1: "py-1", 2: "py-2", 3: "py-3", 4: "py-4", 5: "py-5", 6: "py-6",
  7: "py-7", 8: "py-8", 9: "py-9", 10: "py-10", 11: "py-11", 12: "py-12",
};

export function layoutToClasses(layout?: LayoutProps): string {
  if (!layout) return "";
  const parts: string[] = [];
  if (layout.width) parts.push(baseWidth[layout.width]);
  if (layout.widthMd) parts.push(mdWidth[layout.widthMd]);
  if (layout.widthLg) parts.push(lgWidth[layout.widthLg]);
  if (typeof layout.marginTop === "number") parts.push(MT[layout.marginTop] || "");
  if (typeof layout.marginBottom === "number") parts.push(MB[layout.marginBottom] || "");
  if (typeof layout.paddingX === "number") parts.push(PX[layout.paddingX] || "");
  if (typeof layout.paddingY === "number") parts.push(PY[layout.paddingY] || "");
  if (layout.align) parts.push(alignMap[layout.align]);
  return parts.filter(Boolean).join(" ");
}
