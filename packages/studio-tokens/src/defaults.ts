import type { TokenSet } from "@/packages/studio-schema/src/types";

export const DEFAULT_TOKENS: TokenSet = {
  // ── Brand Colors ───────────────────────────────────────────────────────
  "color.brand.50": { value: "#f5f3ff", category: "color", label: "Brand 50" },
  "color.brand.100": { value: "#ede9fe", category: "color", label: "Brand 100" },
  "color.brand.200": { value: "#ddd6fe", category: "color", label: "Brand 200" },
  "color.brand.300": { value: "#c4b5fd", category: "color", label: "Brand 300" },
  "color.brand.400": { value: "#a78bfa", category: "color", label: "Brand 400" },
  "color.brand.500": { value: "#8b5cf6", category: "color", label: "Brand 500" },
  "color.brand.600": { value: "#7c3aed", category: "color", label: "Brand 600" },
  "color.brand.700": { value: "#6d28d9", category: "color", label: "Brand 700" },
  "color.brand.800": { value: "#5b21b6", category: "color", label: "Brand 800" },
  "color.brand.900": { value: "#4c1d95", category: "color", label: "Brand 900" },

  // ── Neutrals ───────────────────────────────────────────────────────────
  "color.neutral.0": { value: "#ffffff", category: "color", label: "White" },
  "color.neutral.50": { value: "#fafafa", category: "color", label: "Gray 50" },
  "color.neutral.100": { value: "#f5f5f5", category: "color", label: "Gray 100" },
  "color.neutral.200": { value: "#e5e5e5", category: "color", label: "Gray 200" },
  "color.neutral.300": { value: "#d4d4d4", category: "color", label: "Gray 300" },
  "color.neutral.400": { value: "#a3a3a3", category: "color", label: "Gray 400" },
  "color.neutral.500": { value: "#737373", category: "color", label: "Gray 500" },
  "color.neutral.600": { value: "#525252", category: "color", label: "Gray 600" },
  "color.neutral.700": { value: "#404040", category: "color", label: "Gray 700" },
  "color.neutral.800": { value: "#262626", category: "color", label: "Gray 800" },
  "color.neutral.900": { value: "#171717", category: "color", label: "Gray 900" },
  "color.neutral.950": { value: "#0a0a0a", category: "color", label: "Black" },

  // ── Semantic Colors ────────────────────────────────────────────────────
  "color.success": { value: "#22c55e", category: "color", label: "Success" },
  "color.warning": { value: "#f59e0b", category: "color", label: "Warning" },
  "color.error": { value: "#ef4444", category: "color", label: "Error" },
  "color.info": { value: "#3b82f6", category: "color", label: "Info" },

  // ── Typography ─────────────────────────────────────────────────────────
  "font.sans": { value: "Inter, system-ui, -apple-system, sans-serif", category: "font", label: "Sans" },
  "font.serif": { value: "Georgia, 'Times New Roman', serif", category: "font", label: "Serif" },
  "font.mono": { value: "'JetBrains Mono', 'Fira Code', monospace", category: "font", label: "Mono" },
  "font.display": { value: "'Plus Jakarta Sans', Inter, sans-serif", category: "font", label: "Display" },

  "fontSize.xs": { value: 12, category: "fontSize", label: "XS" },
  "fontSize.sm": { value: 14, category: "fontSize", label: "SM" },
  "fontSize.base": { value: 16, category: "fontSize", label: "Base" },
  "fontSize.lg": { value: 18, category: "fontSize", label: "LG" },
  "fontSize.xl": { value: 20, category: "fontSize", label: "XL" },
  "fontSize.2xl": { value: 24, category: "fontSize", label: "2XL" },
  "fontSize.3xl": { value: 30, category: "fontSize", label: "3XL" },
  "fontSize.4xl": { value: 36, category: "fontSize", label: "4XL" },
  "fontSize.5xl": { value: 48, category: "fontSize", label: "5XL" },
  "fontSize.6xl": { value: 60, category: "fontSize", label: "6XL" },
  "fontSize.7xl": { value: 72, category: "fontSize", label: "7XL" },
  "fontSize.8xl": { value: 96, category: "fontSize", label: "8XL" },

  "fontWeight.thin": { value: 100, category: "fontWeight", label: "Thin" },
  "fontWeight.light": { value: 300, category: "fontWeight", label: "Light" },
  "fontWeight.normal": { value: 400, category: "fontWeight", label: "Normal" },
  "fontWeight.medium": { value: 500, category: "fontWeight", label: "Medium" },
  "fontWeight.semibold": { value: 600, category: "fontWeight", label: "Semibold" },
  "fontWeight.bold": { value: 700, category: "fontWeight", label: "Bold" },
  "fontWeight.extrabold": { value: 800, category: "fontWeight", label: "Extra Bold" },
  "fontWeight.black": { value: 900, category: "fontWeight", label: "Black" },

  "lineHeight.tight": { value: 1.25, category: "lineHeight", label: "Tight" },
  "lineHeight.normal": { value: 1.5, category: "lineHeight", label: "Normal" },
  "lineHeight.relaxed": { value: 1.75, category: "lineHeight", label: "Relaxed" },
  "lineHeight.loose": { value: 2, category: "lineHeight", label: "Loose" },

  // ── Spacing ────────────────────────────────────────────────────────────
  "spacing.0": { value: 0, category: "spacing", label: "0" },
  "spacing.1": { value: 4, category: "spacing", label: "1" },
  "spacing.2": { value: 8, category: "spacing", label: "2" },
  "spacing.3": { value: 12, category: "spacing", label: "3" },
  "spacing.4": { value: 16, category: "spacing", label: "4" },
  "spacing.5": { value: 20, category: "spacing", label: "5" },
  "spacing.6": { value: 24, category: "spacing", label: "6" },
  "spacing.8": { value: 32, category: "spacing", label: "8" },
  "spacing.10": { value: 40, category: "spacing", label: "10" },
  "spacing.12": { value: 48, category: "spacing", label: "12" },
  "spacing.16": { value: 64, category: "spacing", label: "16" },
  "spacing.20": { value: 80, category: "spacing", label: "20" },
  "spacing.24": { value: 96, category: "spacing", label: "24" },
  "spacing.32": { value: 128, category: "spacing", label: "32" },

  // ── Radius ─────────────────────────────────────────────────────────────
  "radius.none": { value: 0, category: "radius", label: "None" },
  "radius.sm": { value: 4, category: "radius", label: "SM" },
  "radius.md": { value: 8, category: "radius", label: "MD" },
  "radius.lg": { value: 12, category: "radius", label: "LG" },
  "radius.xl": { value: 16, category: "radius", label: "XL" },
  "radius.2xl": { value: 24, category: "radius", label: "2XL" },
  "radius.full": { value: 9999, category: "radius", label: "Full" },

  // ── Shadows ────────────────────────────────────────────────────────────
  "shadow.sm": { value: "0 1px 2px 0 rgba(0,0,0,0.05)", category: "shadow", label: "SM" },
  "shadow.md": { value: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)", category: "shadow", label: "MD" },
  "shadow.lg": { value: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)", category: "shadow", label: "LG" },
  "shadow.xl": { value: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", category: "shadow", label: "XL" },
  "shadow.2xl": { value: "0 25px 50px -12px rgba(0,0,0,0.25)", category: "shadow", label: "2XL" },
};
