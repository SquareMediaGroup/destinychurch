import type { Color, TokenSet, TokenRef, TokenOrLiteral } from "@/packages/studio-schema/src/types";

export function isTokenRef(v: unknown): v is TokenRef {
  return typeof v === "object" && v !== null && "token" in v;
}

export function resolveToken(tokens: TokenSet, path: string): string | number | undefined {
  const entry = tokens[path];
  return entry?.value;
}

export function resolveTokenOrLiteral<T extends string | number>(
  tokens: TokenSet,
  value: TokenOrLiteral<T> | undefined
): T | undefined {
  if (value === undefined) return undefined;
  if (isTokenRef(value)) {
    return resolveToken(tokens, value.token) as T | undefined;
  }
  return value as T;
}

export function colorToCSS(color: Color | undefined, tokens: TokenSet): string | undefined {
  if (!color) return undefined;
  if (isTokenRef(color)) {
    const resolved = resolveToken(tokens, color.token);
    return typeof resolved === "string" ? resolved : undefined;
  }
  switch (color.type) {
    case "solid": {
      if (color.opacity !== undefined && color.opacity < 1) {
        const r = parseInt(color.hex.slice(1, 3), 16);
        const g = parseInt(color.hex.slice(3, 5), 16);
        const b = parseInt(color.hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${color.opacity})`;
      }
      return color.hex;
    }
    case "linear": {
      const stops = color.stops
        .map((s) => {
          const c = s.opacity !== undefined && s.opacity < 1
            ? `rgba(${parseInt(s.hex.slice(1, 3), 16)}, ${parseInt(s.hex.slice(3, 5), 16)}, ${parseInt(s.hex.slice(5, 7), 16)}, ${s.opacity})`
            : s.hex;
          return `${c} ${s.offset * 100}%`;
        })
        .join(", ");
      return `linear-gradient(${color.angle}deg, ${stops})`;
    }
    case "radial": {
      const stops = color.stops
        .map((s) => `${s.hex} ${s.offset * 100}%`)
        .join(", ");
      return `radial-gradient(circle, ${stops})`;
    }
  }
}

export function tokensToCSSVars(tokens: TokenSet): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [path, entry] of Object.entries(tokens)) {
    const varName = `--${path.replace(/\./g, "-")}`;
    vars[varName] = String(entry.value);
  }
  return vars;
}
