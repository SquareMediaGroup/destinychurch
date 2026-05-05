import type { LayoutProps } from "./types";

const widthMap: Record<NonNullable<LayoutProps["width"]>, string> = {
  auto: "w-auto",
  full: "w-full",
  "1/2": "w-full md:w-1/2",
  "1/3": "w-full md:w-1/3",
  "2/3": "w-full md:w-2/3",
  "1/4": "w-full md:w-1/4",
  "3/4": "w-full md:w-3/4",
};

const alignMap: Record<NonNullable<LayoutProps["align"]>, string> = {
  left: "text-left items-start",
  center: "text-center items-center mx-auto",
  right: "text-right items-end ml-auto",
};

export function layoutToClasses(layout?: LayoutProps): string {
  if (!layout) return "";
  const parts: string[] = [];
  if (layout.width) parts.push(widthMap[layout.width]);
  if (typeof layout.marginTop === "number" && layout.marginTop > 0) {
    parts.push(`mt-${layout.marginTop}`);
  }
  if (typeof layout.marginBottom === "number" && layout.marginBottom > 0) {
    parts.push(`mb-${layout.marginBottom}`);
  }
  if (typeof layout.paddingX === "number" && layout.paddingX > 0) {
    parts.push(`px-${layout.paddingX}`);
  }
  if (typeof layout.paddingY === "number" && layout.paddingY > 0) {
    parts.push(`py-${layout.paddingY}`);
  }
  if (layout.align) parts.push(alignMap[layout.align]);
  return parts.join(" ");
}

// Tailwind safelist — these classes need to be picked up at build time.
// Reference them so JIT/scanner sees them.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _safelist = [
  "mt-1","mt-2","mt-3","mt-4","mt-5","mt-6","mt-8","mt-10","mt-12","mt-16","mt-20","mt-24",
  "mb-1","mb-2","mb-3","mb-4","mb-5","mb-6","mb-8","mb-10","mb-12","mb-16","mb-20","mb-24",
  "px-1","px-2","px-3","px-4","px-5","px-6","px-8","px-10","px-12",
  "py-1","py-2","py-3","py-4","py-5","py-6","py-8","py-10","py-12",
];
