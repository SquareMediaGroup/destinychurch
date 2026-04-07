"use client";

import { createContext, useContext } from "react";

export type BannerType = "announcement" | "notice" | "sitewide";

export interface BannerData {
  active: boolean;
  message: string;
  type: BannerType;
  link?: string | null;
  link_text?: string | null;
}

export const BannerContext = createContext<BannerData>({
  active: false,
  message: "",
  type: "announcement",
});

export function useBanner() {
  return useContext(BannerContext);
}
