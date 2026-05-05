"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ElementType } from "@/lib/builder/types";

// Lazy-load all brand components — they're only needed inside the canvas
const HeroSection = dynamic(() => import("@/components/home/HeroSection"), { ssr: false });
const MissionSection = dynamic(() => import("@/components/home/MissionSection"), { ssr: false });
const WhatsOnSection = dynamic(() => import("@/components/home/WhatsOnSection"), { ssr: false });
const WorshipWithUsSection = dynamic(() => import("@/components/home/WorshipWithUsSection"), { ssr: false });
const GetInvolvedSection = dynamic(() => import("@/components/home/GetInvolvedSection"), { ssr: false });
const LatestSermonSection = dynamic(() => import("@/components/home/LatestSermonSection"), { ssr: false });
const EveryoneHasAPlaceSection = dynamic(() => import("@/components/home/EveryoneHasAPlaceSection"), { ssr: false });

const AboutHero = dynamic(() => import("@/components/about/AboutHero"), { ssr: false });
const AboutMissionStatement = dynamic(() => import("@/components/about/AboutMissionStatement"), { ssr: false });
const AboutMissionCard = dynamic(() => import("@/components/about/AboutMissionCard"), { ssr: false });
const BeliefsSection = dynamic(() => import("@/components/about/BeliefsSection"), { ssr: false });
const MeetPastorsSection = dynamic(() => import("@/components/about/MeetPastorsSection"), { ssr: false });
const TeamSection = dynamic(() => import("@/components/about/TeamSection"), { ssr: false });
const MagnifySection = dynamic(() => import("@/components/about/MagnifySection"), { ssr: false });
const MinistriesGrid = dynamic(() => import("@/components/serve/MinistriesGrid"), { ssr: false });

export const BRAND_COMPONENTS: Partial<Record<ElementType, ComponentType<Record<string, unknown>>>> = {
  HeroSection: HeroSection as ComponentType<Record<string, unknown>>,
  MissionSection: MissionSection as ComponentType<Record<string, unknown>>,
  WhatsOnSection: WhatsOnSection as ComponentType<Record<string, unknown>>,
  WorshipWithUsSection: WorshipWithUsSection as ComponentType<Record<string, unknown>>,
  GetInvolvedSection: GetInvolvedSection as ComponentType<Record<string, unknown>>,
  LatestSermonSection: LatestSermonSection as ComponentType<Record<string, unknown>>,
  EveryoneHasAPlaceSection: EveryoneHasAPlaceSection as ComponentType<Record<string, unknown>>,
  AboutHero: AboutHero as ComponentType<Record<string, unknown>>,
  AboutMissionStatement: AboutMissionStatement as ComponentType<Record<string, unknown>>,
  AboutMissionCard: AboutMissionCard as ComponentType<Record<string, unknown>>,
  BeliefsSection: BeliefsSection as ComponentType<Record<string, unknown>>,
  MeetPastorsSection: MeetPastorsSection as ComponentType<Record<string, unknown>>,
  TeamSection: TeamSection as ComponentType<Record<string, unknown>>,
  MagnifySection: MagnifySection as ComponentType<Record<string, unknown>>,
  MinistriesGrid: MinistriesGrid as ComponentType<Record<string, unknown>>,
};
