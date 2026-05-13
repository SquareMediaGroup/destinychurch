"use client";

import React from "react";
import type { TokenSet } from "@/packages/studio-schema/src/types";
import { tokensToCSSVars } from "./resolve";

export function TokenStyle({ tokens }: { tokens: TokenSet }) {
  const vars = tokensToCSSVars(tokens);
  const css = Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n  ");

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root {\n  ${css}\n}`,
      }}
    />
  );
}
