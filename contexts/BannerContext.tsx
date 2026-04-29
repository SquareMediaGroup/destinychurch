"use client";

import { createContext, useContext } from "react";

export type BannerType =
  | "announcement"
  | "notice"
  | "sitewide"
  | "alpha"
  | "youth_alpha";

export interface AlphaBannerInfo {
  start_date: string;
  signup_url: string;
  frequency: string;
  custom_interval_days?: number | null;
  format?: "in_person" | "online" | null;
  location?: string | null;
  meeting_platform?: "zoom" | "google_meet" | null;
}

export interface BannerData {
  active: boolean;
  message: string;
  type: BannerType;
  link?: string | null;
  link_text?: string | null;
  alpha?: AlphaBannerInfo | null;
  companion?: BannerData | null;
}

export const BannerContext = createContext<BannerData>({
  active: false,
  message: "",
  type: "announcement",
});

export function useBanner() {
  return useContext(BannerContext);
}
