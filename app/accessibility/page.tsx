"use client";

import { useAccessibility } from "@/contexts/AccessibilityContext";
import React from "react";
import Link from "next/link";

export default function AccessibilityPage() {
  const { glassFX, setGlassFX, reducedMotion, setReducedMotion } = useAccessibility();

  return (
    <div className="bg-[#f5f7fa] min-h-[100dvh] pt-24 pb-20 sm:pt-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-destiny-grey/60 hover:text-destiny-orange transition-colors">
            <span className="material-symbols-rounded mr-2 text-[20px]">arrow_back</span>
            Back to Home
          </Link>
        </div>

        <h1 className="mb-4 text-4xl font-black text-destiny-grey sm:text-5xl">
          Accessibility
        </h1>
        <p className="mb-12 text-lg text-destiny-grey/70">
          Customise your browsing experience. We want everyone to enjoy Destiny Church with optimal comfort and performance.
        </p>

        <div className="space-y-6">
          {/* GlassFX Toggle */}
          <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-destiny-grey mb-2 flex items-center gap-2">
                  <span className="material-symbols-rounded text-destiny-orange">layers</span>
                  Glass Effects
                </h2>
                <p className="text-sm text-destiny-grey/70 max-w-lg">
                  Enable or disable translucent, blurry backgrounds on elements like menus and banners. 
                  Turning this off can improve readability and performance on older devices.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={glassFX}
                  onChange={(e) => setGlassFX(e.target.checked)}
                />
                <div className="w-14 h-7 bg-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destiny-orange"></div>
                <span className="ml-3 text-sm font-medium text-destiny-grey w-16">
                  {glassFX ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
          </section>

          {/* Reduced Motion Toggle */}
          <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-destiny-grey mb-2 flex items-center gap-2">
                  <span className="material-symbols-rounded text-destiny-blue">animation</span>
                  Reduce Animations
                </h2>
                <p className="text-sm text-destiny-grey/70 max-w-lg">
                  Turn off interface animations and transitions. This helps reduce distractions and is recommended if you experience motion sickness.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
                <div className="w-14 h-7 bg-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destiny-blue"></div>
                <span className="ml-3 text-sm font-medium text-destiny-grey w-16">
                  {reducedMotion ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
