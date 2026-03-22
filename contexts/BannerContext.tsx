"use client";

import { createContext, useContext } from "react";

interface BannerData {
  active: boolean;
  message: string;
  link?: string | null;
  link_text?: string | null;
}

export const BannerContext = createContext<BannerData>({ active: false, message: "" });

export function useBanner() {
  return useContext(BannerContext);
}
