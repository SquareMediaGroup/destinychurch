"use client";

import { useAccessibility } from "@/contexts/AccessibilityContext";
import React from "react";
import Link from "next/link";

export default function AccessibilityPage() {
  const { glassFX, setGlassFX, reducedMotion, setReducedMotion } = useAccessibility();

  return (
    <div className="relative min-h-[100dvh] overflow-hidden pt-24 pb-12 sm:pt-32">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0d0d0d]"></div>
        <div className="absolute top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-destiny-orange/10 blur-[120px] mix-blend-screen opacity-60 animate-[pulse_10s_ease-in-out_infinite_alternate]"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-blue-500/10 blur-[100px] mix-blend-screen opacity-50 animate-[pulse_12s_ease-in-out_infinite_alternate-reverse]"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-rounded mr-2 text-[20px]">arrow_back</span>
            Back to Home
          </Link>
        </div>

        <h1 className="font-anton text-5xl uppercase tracking-wider text-white sm:text-6xl lg:text-7xl mb-4">
          Accessibility
        </h1>
        <p className="font-playfair text-xl text-white/80 italic mb-12 max-w-2xl">
          Customize your browsing experience. We want everyone to enjoy Destiny Church with optimal comfort and performance.
        </p>

        <div className="space-y-8">
          {/* GlassFX Toggle */}
          <section className="glass glass-strong glass-refract rounded-3xl p-6 sm:p-8 border border-white/10">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-rounded text-destiny-orange">layers</span>
                  GlassFX
                </h2>
                <p className="text-white/70 max-w-xl">
                  Our signature Liquid Glass effect provides stunning, real-time light refraction across the interface. 
                  <span className="block mt-2 text-destiny-orange/90 font-medium text-sm">
                    Recommendation: Turn off for better performance on older devices or if you prefer a simpler Frosted Glass look.
                  </span>
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={glassFX}
                  onChange={(e) => setGlassFX(e.target.checked)}
                />
                <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-destiny-orange"></div>
                <span className="ml-3 text-sm font-medium text-white/90 w-16">
                  {glassFX ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            {/* Example Card */}
            <div className="mt-8 p-6 sm:p-10 rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-destiny-orange/30 to-purple-600/30 opacity-50 transition-opacity duration-700 group-hover:opacity-80"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center">
                <p className="text-sm text-white/50 mb-4 uppercase tracking-widest font-semibold">Live Preview</p>
                <div className="glass glass-strong glass-refract rounded-2xl p-6 w-full max-w-sm flex items-center gap-4 border border-white/10 shadow-2xl transition-transform duration-500 hover:scale-105">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                    <span className="material-symbols-rounded text-white">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">Refractive Surface</h3>
                    <p className="text-white/70 text-sm mt-1">Observe the background blending through this element.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Reduced Motion Toggle */}
          <section className="glass glass-strong glass-refract rounded-3xl p-6 sm:p-8 border border-white/10">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-rounded text-blue-400">animation</span>
                  Disable Animations
                </h2>
                <p className="text-white/70 max-w-xl">
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
                <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                <span className="ml-3 text-sm font-medium text-white/90 w-16">
                  {reducedMotion ? "Disabled" : "Enabled"}
                </span>
              </label>
            </div>
          </section>
          
        </div>
      </div>
    </div>
  );
}
